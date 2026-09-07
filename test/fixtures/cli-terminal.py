"""Exercise the real CLI with terminal echo, editing and paste enabled."""
import errno
import json
import fcntl
import os
import pty
import re
import select
import struct
import subprocess
import sys
import termios
import time
import tempfile

master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 30, 100, 0, 0))
original = termios.tcgetattr(slave)
storage = tempfile.TemporaryDirectory(prefix="sdlm-terminal-")
child = subprocess.Popen([sys.argv[1], 'src/cli.mjs', '--sessions', storage.name], stdin=slave, stdout=slave, stderr=slave,
                         start_new_session=True)
transcript = bytearray()
ansi = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')


def received():
    return ansi.sub('', transcript.decode('utf-8', errors='replace'))


def expect(text, start=0):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if text in received()[start:]:
            return
        ready, _, _ = select.select([master], [], [], 0.1)
        if ready:
            try:
                block = os.read(master, 65536)
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                raise
            if not block:
                break
            transcript.extend(block)
        if child.poll() is not None:
            break
    raise AssertionError(f'Expected {text!r} after offset {start}; terminal output: {received()!r}')


def send(text):
    start = len(received())
    os.write(master, text.encode('utf-8'))
    return start


try:
    expect('sdlm> ')
    start = send('/helq')
    expect('/helq', start)  # Echo must exist before Enter, not just in the command result.
    start = send('\x7fp\r')
    expect('/examples [number|all]', start)
    expect('sdlm> ', start)
    start = send('\x1b[A')
    expect('/help', start)  # Readline history and editing remain available.
    send('\x15')
    start = send('\x1b[200~Alice is human.\r\nIs Alice human?\r\n/sta\x1b[201~')
    expect('Learned.', start)
    expect('Yes.', start)
    assert received()[start:].index('Learned.') < received()[start:].index('Yes.')
    expect('sdlm> /sta', start)  # The unfinished last pasted line survives earlier commands.
    start = send('tus\r')
    expect('"engine":', start)
    expect('sdlm> ', start)
    assert 'ERROR:' not in received(), received()
    send('\x03' if sys.argv[2] == 'interrupt' else '/quit\r')
    assert child.wait(timeout=15) == 0
    restored = termios.tcgetattr(slave)
    assert restored[3] & (termios.ECHO | termios.ICANON) == original[3] & (termios.ECHO | termios.ICANON)
    with open(os.path.join(storage.name, '.cli-state.json')) as saved:
        session = json.load(saved)['lastSession']
    record_file = os.path.join(storage.name, session, 'session.json')
    with open(record_file) as saved:
        original_turns = json.load(saved)['turns']
    transcript.clear()
    child = subprocess.Popen([sys.argv[1], 'src/cli.mjs', '--sessions', storage.name],
                             stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    expect(f'Session {session}. Changes are saved automatically.')
    expect('sdlm> ')
    start = send('\x1b[A')
    expect('/status', start)  # Recall survives a process restart; /quit is omitted.
    start = send('\r')
    expect('"session":', start)
    expect('sdlm> ', start)
    with open(record_file) as saved:
        assert json.load(saved)['turns'] == original_turns  # No conversational replay.
    start = send('Is Alice human?\r')
    expect('Yes.', start)
    expect('sdlm> ', start)
    start = send('/session new clean\r')
    expect('Session clean. Changes are saved automatically.', start)
    expect('sdlm> ', start)
    send('/quit\r')
    assert child.wait(timeout=15) == 0
    transcript.clear()
    child = subprocess.Popen([sys.argv[1], 'src/cli.mjs', '--sessions', storage.name],
                             stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    expect('Session clean. Changes are saved automatically.')
    expect('sdlm> ')
    start = send('Is Alice human?\r')
    expect('Unknown:', start)
    expect('sdlm> ', start)
    send('/quit\r')
    assert child.wait(timeout=15) == 0
    restored = termios.tcgetattr(slave)
    assert restored[3] & (termios.ECHO | termios.ICANON) == original[3] & (termios.ECHO | termios.ICANON)
    transcript.clear()
    child = subprocess.Popen([sys.argv[1], 'src/cli.mjs', '--sessions', storage.name, '--temporary'],
                             stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    expect('Temporary session. Use /session save <name> to keep this work.')
    expect('sdlm> ')
    send('/quit\r')
    assert child.wait(timeout=15) == 0
    with open(os.path.join(storage.name, '.cli-state.json')) as saved:
        assert json.load(saved)['lastSession'] == 'clean'
    print('PTY checks passed: visible typing, editing, paste, persistent arrow history, automatic session continuation, new sessions, temporary opt-out and terminal restoration.')
finally:
    if child.poll() is None:
        child.kill()
        child.wait()
    os.close(master)
    os.close(slave)
    storage.cleanup()
