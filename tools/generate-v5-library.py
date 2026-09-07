from pathlib import Path
import re, shutil
ROOT=Path(__file__).resolve().parents[1]
MICRO=ROOT/'circuits/english/microSentence'
MICRO.mkdir(parents=True, exist_ok=True)
for f in MICRO.glob('*.sop'): f.unlink()

def safe(s):
    return re.sub(r'[^A-Za-z0-9]+','_',s).strip('_').title().replace('_','')

def third(v):
    irregular={'have':'has','do':'does','go':'goes','study':'studies','try':'tries','carry':'carries','fly':'flies'}
    if v in irregular:return irregular[v]
    if v.endswith(('s','x','z','ch','sh','o')):return v+'es'
    if len(v)>1 and v.endswith('y') and v[-2] not in 'aeiou':return v[:-1]+'ies'
    return v+'s'

def past(v):
    irr={'see':('saw','seen'),'write':('wrote','written'),'make':('made','made'),'take':('took','taken'),'give':('gave','given'),
         'send':('sent','sent'),'read':('read','read'),'find':('found','found'),'build':('built','built'),'teach':('taught','taught'),
         'know':('knew','known'),'understand':('understood','understood'),'lead':('led','led'),'think':('thought','thought'),
         'buy':('bought','bought'),'bring':('brought','brought'),'choose':('chose','chosen'),'come':('came','come'),'become':('became','become'),
         'run':('ran','run'),'say':('said','said'),'tell':('told','told'),'get':('got','gotten'),'hold':('held','held'),'keep':('kept','kept'),
         'leave':('left','left'),'meet':('met','met'),'pay':('paid','paid'),'put':('put','put'),'set':('set','set'),'show':('showed','shown'),
         'speak':('spoke','spoken'),'spend':('spent','spent'),'stand':('stood','stood'),'win':('won','won'),'lose':('lost','lost')}
    if v in irr:return irr[v]
    if v.endswith('e'): return v+'d',v+'d'
    if len(v)>1 and v.endswith('y') and v[-2] not in 'aeiou': return v[:-1]+'ied',v[:-1]+'ied'
    return v+'ed',v+'ed'

def ing(v):
    if v.endswith('ie'): return v[:-2]+'ying'
    if v.endswith('e') and not v.endswith(('ee','ye')): return v[:-1]+'ing'
    return v+'ing'

verbs='''like trust help know see support require use study write improve reduce increase cause create build test validate audit review analyze explain describe summarize compare teach learn understand find discover develop design make take give send receive read evaluate measure predict classify detect monitor manage control include contain produce generate solve answer ask consider believe prefer need want own follow lead affect change enable prevent protect attack verify prove refute derive infer store retrieve select rank parse interpret transform expand compress connect link map represent model simulate plan execute call invoke process combine separate organize coordinate collaborate observe report document publish cite reference query search filter optimize train adapt align justify challenge accept reject propose inspect calculate estimate check track update merge split copy move create delete preserve restore recover schedule trigger resolve disambiguate normalize tokenize classify compose decompose synthesize induce generalize specialize score choose explore prune commit rollback remember forget load unload cache index materialize invalidate supersede version compare explain summarize expand render realize formulate phrase translate rewrite'''.split()
# unique and cap 120
verbs=list(dict.fromkeys(verbs))[:120]

properties='''human mortal finite smart creative rational innovative curious cautious reliable important promising useful valid safe secure private public correct incorrect true false consistent inconsistent complete incomplete relevant irrelevant novel known unknown possible impossible necessary sufficient robust fragile stable unstable scalable efficient effective slow fast complex simple local global active passive available unavailable ready blocked open closed expensive cheap valuable risky uncertain certain likely unlikely independent dependent compatible incompatible aligned misaligned trustworthy untrustworthy transparent opaque auditable reproducible scientific symbolic neural hybrid deterministic stochastic recursive monotonic nonmonotonic persistent temporary abstract concrete general specific formal informal logical coherent ambiguous clear concise detailed accurate approximate adaptive autonomous collaborative distributed decentralized centralized verifiable explainable interpretable executable compositional modular reusable extensible learned derived asserted supported refuted contradictory optimal minimal maximal semantic syntactic epistemic causal temporal probabilistic relational functional procedural declarative transactional speculative irreversible reversible recoverable resilient credible surprising significant measurable testable falsifiable observable hidden visible structured unstructured typed untyped grounded ungrounded contextual situated invariant dynamic static incremental interactive parallel sequential synchronous asynchronous deterministic uncertain rigorous pragmatic theoretical empirical automatic manual intelligent bounded accountable traceable inspectable maintainable portable interoperable accessible restricted confidential authentic synthetic realistic artificial useful harmful beneficial dangerous fair biased neutral consistent redundant sparse dense hierarchical flat recursive compositional emergent explicit implicit direct indirect primary secondary central peripheral'''.split()
properties=list(dict.fromkeys(properties))[:180]

relations='''parent ancestor friend sibling colleague member part owner author reviewer advisor mentor student teacher source target input output component dependency predecessor successor partner competitor collaborator leader follower user creator consumer producer validator auditor expert agent model tool method process rule fact claim evidence explanation summary example counterexample hypothesis result cause effect version copy representation implementation abstraction interface instance subclass superclass neighbor client server coordinator contributor observer subject object beneficiary provider sponsor manager worker researcher scientist engineer analyst reviewer operator controller participant stakeholder'''.split()
relations=list(dict.fromkeys(relations))[:60]

# Lexicon bootstrap
lex=ROOT/'circuits/english/bootstrap/EnglishLexiconV5.sop'
lines=['# Generated lexical knowledge for V5. This is SOP data, not JavaScript language knowledge.']
node=0
for surface,klass,lemma in [
    ('can','modal','can'),('could','modal','could'),('may','modal','may'),('might','modal','might'),('must','modal','must'),('should','modal','should'),('would','modal','would'),('will','modal','will'),
    ('is','copula','be'),('are','copula','be'),('was','copula','be'),('were','copula','be'),('does','auxDo','do'),('did','auxDo','do'),('do','auxDo','do')]:
    node+=1; lines += [f'@l{node} addLexeme',f'    surface "{surface}"',f'    class "{klass}"',f'    lemma "{lemma}"']
for v in verbs:
    p,pp=past(v); forms=[(v,'verbBase',v),(third(v),'verb3',v),(p,'verbPast',v),(pp,'verbPart',v),(ing(v),'verbIng',v)]
    for surface,klass,lemma in forms:
        node+=1; lines += [f'@l{node} addLexeme',f'    surface "{surface}"',f'    class "{klass}"',f'    lemma "{lemma}"']
lines += ['@ready constant','    value true','@output result $ready']
lex.write_text('\n'.join(lines)+'\n')

count=0

def write_circuit(name, guards, body):
    global count
    text=['@input tokens']
    gi=0
    for cmd,args in guards:
        gi+=1; text.append(f'@g{gi} {cmd}')
        for k,v in args.items():
            if isinstance(v,str): text.append(f'    {k} "{v}"')
            else: text.append(f'    {k} {v}')
    text += ['@bias candidateWeight','    weight 20']
    text += body
    (MICRO/f'{name}.sop').write_text('\n'.join(text)+'\n')
    count+=1

def base_guards(n, exact):
    gs=[('tokenCountIs',{'tokens':'$tokens','count':n})]
    # value refs need unquoted special handling later; generate manually
    return gs

# helper because refs shouldn't be quoted
def circuit_text(name, n, exact_tokens, class_tokens, call, params, bias=20):
    global count
    out=['@input tokens', '@g0 tokenCountIs','    tokens $tokens',f'    count {n}']
    i=0
    for idx,val in exact_tokens:
        i+=1; out += [f'@g{i} tokenIs','    tokens $tokens',f'    index {idx}',f'    value "{val}"']
    for idx,klass in class_tokens:
        i+=1; out += [f'@g{i} tokenClassIs','    tokens $tokens',f'    index {idx}',f'    class "{klass}"']
    out += ['@bias candidateWeight',f'    weight {bias}',f'@result {call}','    tokens $tokens']
    for k,v in params.items():
        if isinstance(v,str) and v.startswith('$'): out.append(f'    {k} {v}')
        elif isinstance(v,str): out.append(f'    {k} "{v}"')
        else: out.append(f'    {k} {v}')
    out += ['@output result $result']
    (MICRO/f'{name}.sop').write_text('\n'.join(out)+'\n'); count+=1

# Properties: seven common surface families each.
for prop in properties:
    N=safe(prop)
    circuit_text(f'MicroPropPresent{N}',4,[(1,'is'),(2,prop),(3,'.')],[(0,'entity')],'MicroUnaryFact',{'predicate':prop},24)
    circuit_text(f'MicroPropPast{N}',4,[(1,'was'),(2,prop),(3,'.')],[(0,'entity')],'MicroUnaryFact',{'predicate':prop},20)
    circuit_text(f'MicroPropNegative{N}',5,[(1,'is'),(2,'not'),(3,prop),(4,'.')],[(0,'entity')],'MicroUnaryNegativeFact',{'predicate':prop},24)
    circuit_text(f'MicroPropQuestion{N}',4,[(0,'is'),(2,prop),(3,'?')],[(1,'entity')],'MicroUnaryAsk',{'predicate':prop,'subjectIndex':1},24)
    circuit_text(f'MicroPropPastQuestion{N}',4,[(0,'was'),(2,prop),(3,'?')],[(1,'entity')],'MicroUnaryAsk',{'predicate':prop,'subjectIndex':1},20)
    # who forms do not need entity input
    out=['@input tokens','@g0 tokenCountIs','    tokens $tokens','    count 4','@g1 tokenIs','    tokens $tokens','    index 0','    value "who"','@g2 tokenIs','    tokens $tokens','    index 1','    value "is"','@g3 tokenIs','    tokens $tokens','    index 2',f'    value "{prop}"','@g4 tokenLastIs','    tokens $tokens','    value "?"','@bias candidateWeight','    weight 23',f'@result MicroUnaryWho','    predicate "'+prop+'"','@output result $result']
    (MICRO/f'MicroPropWho{N}.sop').write_text('\n'.join(out)+'\n'); count+=1
    circuit_text(f'MicroPropArticle{N}',5,[(1,'is'),(2,'a'),(3,prop),(4,'.')],[(0,'entity')],'MicroUnaryFact',{'predicate':prop},18)

# Verb micro-experts: 10 forms each.
for v in verbs:
    v3=third(v); vp,vpp=past(v); N=safe(v)
    circuit_text(f'MicroVerbPresent{N}',4,[(1,v3),(3,'.')],[(0,'entity'),(2,'entity')],'MicroBinaryFact',{'predicate':v,'subjectIndex':0,'objectIndex':2},30)
    circuit_text(f'MicroVerbPast{N}',4,[(1,vp),(3,'.')],[(0,'entity'),(2,'entity')],'MicroBinaryFact',{'predicate':v,'subjectIndex':0,'objectIndex':2},27)
    circuit_text(f'MicroVerbNegative{N}',6,[(1,'does'),(2,'not'),(3,v),(5,'.')],[(0,'entity'),(4,'entity')],'MicroBinaryNegativeFact',{'predicate':v,'subjectIndex':0,'objectIndex':4},30)
    circuit_text(f'MicroVerbPastNegative{N}',6,[(1,'did'),(2,'not'),(3,v),(5,'.')],[(0,'entity'),(4,'entity')],'MicroBinaryNegativeFact',{'predicate':v,'subjectIndex':0,'objectIndex':4},27)
    circuit_text(f'MicroVerbQuestion{N}',5,[(0,'does'),(2,v),(4,'?')],[(1,'entity'),(3,'entity')],'MicroBinaryAsk',{'predicate':v,'subjectIndex':1,'objectIndex':3},30)
    circuit_text(f'MicroVerbPastQuestion{N}',5,[(0,'did'),(2,v),(4,'?')],[(1,'entity'),(3,'entity')],'MicroBinaryAsk',{'predicate':v,'subjectIndex':1,'objectIndex':3},27)
    # who subject
    out=['@input tokens','@g0 tokenCountIs','    tokens $tokens','    count 4','@g1 tokenIs','    tokens $tokens','    index 0','    value "who"','@g2 tokenIs','    tokens $tokens','    index 1',f'    value "{v3}"','@g3 tokenClassIs','    tokens $tokens','    index 2','    class "entity"','@g4 tokenLastIs','    tokens $tokens','    value "?"','@bias candidateWeight','    weight 29','@result MicroBinaryWhoSubject','    tokens $tokens',f'    predicate "{v}"','    objectIndex 2','@output result $result']
    (MICRO/f'MicroVerbWhoSubject{N}.sop').write_text('\n'.join(out)+'\n'); count+=1
    circuit_text(f'MicroVerbWhoObject{N}',6,[(0,'who'),(1,'does'),(3,v),(5,'?')],[(2,'entity')],'MicroBinaryWhoObject',{'predicate':v,'subjectIndex':2},29)
    circuit_text(f'MicroVerbCan{N}',5,[(1,'can'),(2,v),(4,'.')],[(0,'entity'),(3,'entity')],'MicroQualifiedBinaryFact',{'predicate':v,'qualifier':'can','subjectIndex':0,'objectIndex':3},24)
    # passive: patient is vpp by agent
    circuit_text(f'MicroVerbPassive{N}',6,[(1,'is'),(2,vpp),(3,'by'),(5,'.')],[(0,'entity'),(4,'entity')],'MicroBinaryFact',{'predicate':v,'subjectIndex':4,'objectIndex':0},26)

# Relation nouns: six forms.
for rel in relations:
    N=safe(rel)
    circuit_text(f'MicroRelFact{N}',7,[(1,'is'),(2,'a'),(3,rel),(4,'of'),(6,'.')],[(0,'entity'),(5,'entity')],'MicroBinaryFact',{'predicate':rel,'subjectIndex':0,'objectIndex':5},28)
    circuit_text(f'MicroRelNegative{N}',8,[(1,'is'),(2,'not'),(3,'a'),(4,rel),(5,'of'),(7,'.')],[(0,'entity'),(6,'entity')],'MicroBinaryNegativeFact',{'predicate':rel,'subjectIndex':0,'objectIndex':6},28)
    circuit_text(f'MicroRelQuestion{N}',8,[(0,'is'),(2,'a'),(3,rel),(4,'of'),(7,'?')],[(1,'entity'),(5,'entity')],'MicroBinaryAsk',{'predicate':rel,'subjectIndex':1,'objectIndex':5},28)
    # Who is a rel of Bob?
    out=['@input tokens','@g0 tokenCountIs','    tokens $tokens','    count 7','@g1 tokenIs','    tokens $tokens','    index 0','    value "who"','@g2 tokenIs','    tokens $tokens','    index 1','    value "is"','@g3 tokenIs','    tokens $tokens','    index 2','    value "a"','@g4 tokenIs','    tokens $tokens','    index 3',f'    value "{rel}"','@g5 tokenIs','    tokens $tokens','    index 4','    value "of"','@g6 tokenClassIs','    tokens $tokens','    index 5','    class "entity"','@g7 tokenLastIs','    tokens $tokens','    value "?"','@bias candidateWeight','    weight 27','@result MicroBinaryWhoSubject','    tokens $tokens',f'    predicate "{rel}"','    objectIndex 5','@output result $result']
    (MICRO/f'MicroRelWho{N}.sop').write_text('\n'.join(out)+'\n'); count+=1
    circuit_text(f'MicroRelPast{N}',7,[(1,'was'),(2,'a'),(3,rel),(4,'of'),(6,'.')],[(0,'entity'),(5,'entity')],'MicroBinaryFact',{'predicate':rel,'subjectIndex':0,'objectIndex':5},20)
    circuit_text(f'MicroRelBareFact{N}',6,[(1,'is'),(2,rel),(3,'of'),(5,'.')],[(0,'entity'),(4,'entity')],'MicroBinaryFact',{'predicate':rel,'subjectIndex':0,'objectIndex':4},18)

# Task paraphrases use a Python sentinel object for the entity slot; no string placeholder language is involved.
ENTITY_SLOT = object()
tasks=[
 ('TellMeAbout',['tell','me','about',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('GiveSummaryOf',['give','me','a','summary','of',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('ProvideSummaryOf',['provide','a','summary','of',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('GiveBriefOn',['give','me','a','brief','on',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('BriefMeOn',['brief','me','on',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('DescribeEntity',['describe',ENTITY_SLOT,'.'],'MicroDescribeEntity'),
 ('WhatKnowAbout',['what','do','you','know','about',ENTITY_SLOT,'?'],'MicroDescribeEntity'),
 ('ListFactsAbout',['list','facts','about',ENTITY_SLOT,'.'],'MicroDescribeEntity'),
 ('ExpandEntity',['expand',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ExpandIdea',['expand','the','idea',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ExplainMore',['explain',ENTITY_SLOT,'in','more','detail','.'],'MicroExpandEntity'),
 ('MoreDetailAbout',['give','me','more','detail','about',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('DevelopIdea',['develop','the','idea',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ShortParagraph',['write','a','short','paragraph','about',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('DetailedParagraph',['write','a','detailed','paragraph','about',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ConciseSummary',['give','me','a','concise','summary','of',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('DetailedExplanation',['give','me','a','detailed','explanation','of',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ExplainEntity',['explain',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('MainFacts',['list','the','main','facts','about',ENTITY_SLOT,'.'],'MicroDescribeEntity'),
 ('KnownFacts',['show','me','what','is','known','about',ENTITY_SLOT,'.'],'MicroDescribeEntity'),
 ('Synthesize',['synthesize','what','is','known','about',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('Overview',['give','an','overview','of',ENTITY_SLOT,'.'],'MicroSummarizeEntity'),
 ('Elaborate',['elaborate','on',ENTITY_SLOT,'.'],'MicroExpandEntity'),
 ('ExplainKnowledge',['explain','what','is','known','about',ENTITY_SLOT,'.'],'MicroExpandEntity'),
]
for ti,(name,toks,core) in enumerate(tasks):
    # make several politeness variants for each
    for prefix_name,prefix in [('',''),('Please',['please']),('CouldYou',['could','you']),('CanYou',['can','you'])]:
        seq=(prefix if isinstance(prefix,list) else [])+toks
        entity_idx=seq.index(ENTITY_SLOT)
        exact=[]; classes=[(entity_idx,'entity')]
        for i,t in enumerate(seq):
            if t is not ENTITY_SLOT: exact.append((i,t))
        circuit_text(f'MicroTask{prefix_name}{name}',len(seq),exact,classes,core,{'entityIndex':entity_idx},22)


# Deliberately ambiguous PP-attachment probe. Both circuits are valid and equally scored;
# the runtime must preserve ambiguity instead of mutating the KB through either branch.
amb_common=['@input tokens','@g0 tokenCountIs','    tokens $tokens','    count 6','@g1 tokenClassIs','    tokens $tokens','    index 0','    class "entity"','@g2 tokenIs','    tokens $tokens','    index 1','    value "saw"','@g3 tokenClassIs','    tokens $tokens','    index 2','    class "entity"','@g4 tokenIs','    tokens $tokens','    index 3','    value "with"','@g5 tokenClassIs','    tokens $tokens','    index 4','    class "entity"','@g6 tokenLastIs','    tokens $tokens','    value "."','@bias candidateWeight','    weight 50']
inst=amb_common+['@s termAt','    tokens $tokens','    index 0','@o termAt','    tokens $tokens','    index 2','@a makeBinaryAtom','    subject $s','    predicate "see"','    object $o','    polarity "positive"','@command makeCommand','    kind "assertFact"','    payload $a','@output result $command']
(MICRO/'MicroAmbiguousSawWithInstrument.sop').write_text('\n'.join(inst)+'\n'); count+=1
comp=amb_common+['@s termAt','    tokens $tokens','    index 0','@o termAt','    tokens $tokens','    index 2','@c termAt','    tokens $tokens','    index 4','@see makeBinaryAtom','    subject $s','    predicate "see"','    object $o','    polarity "positive"','@with makeBinaryAtom','    subject $o','    predicate "with"','    object $c','    polarity "positive"','@facts list','    item1 $see','    item2 $with','@command makeCommand','    kind "assertFacts"','    payload $facts','@output result $command']
(MICRO/'MicroAmbiguousSawWithCompanion.sop').write_text('\n'.join(comp)+'\n'); count+=1

print(f'generated {count} micro circuits; {len(verbs)} verbs; {len(properties)} properties; {len(relations)} relations')
