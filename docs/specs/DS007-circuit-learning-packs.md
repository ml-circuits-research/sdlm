---
title: DS007-circuit-learning-packs
summary: Defines validated induction, installation and atomic pack publication.
---

## Introduction

This specification defines validated [induction](../wiki.html#definition-induction), installation and atomic pack publication for [sdlm](../wiki.html#definition-sdlm).

## Core Content

[Induction](../wiki.html#definition-induction) must receive surface/canonical examples and produce ordinary [SOP circuits](../wiki.html#definition-semantic-circuit). The learned semantic form must preserve polarity and [qualifiers](../wiki.html#definition-qualifier). The system must compile, install in a reversible trial, validate all supplied samples, and only then publish the pack. Failed validation or publication must restore the pre-operation registry and symbolic state. Existing pack directories must not be overwritten.

Installation must validate the combined [circuit](../wiki.html#definition-semantic-circuit) library before running incoming [bootstraps](../wiki.html#definition-bootstrap). Publication must stage a complete pack beside its target and rename it atomically under an exclusive publication lock. Installed source must remain available for [session](../wiki.html#definition-session) export even when an upload temporary directory is removed.

The HTTP upload contract must accept relative SOP paths and mandatory exact-result acceptance tests. Path traversal and duplicate names must fail. Acceptance tests must execute in a separate trial [snapshot](../wiki.html#definition-snapshot) so test knowledge cannot leak into the destination [session](../wiki.html#definition-session). The limits are 1,000 uploaded files and 128 tests within the request body limit.

Coding agents remain external authors. Pack installation must not imply autonomous agent execution or correctness beyond its validation and test inputs. Knowledge-only export and full [session](../wiki.html#definition-session) export are distinct operations.

Knowledge-only export must refuse active [assumption](../wiki.html#definition-assumption) dependencies because it cannot preserve their correction contract. Full [session](../wiki.html#definition-session) export must preserve them. Feedback export may supply external authors with actual decisions and unresolved input, but must not be described as autonomous [circuit](../wiki.html#definition-semantic-circuit) improvement. Exact pack acceptance tests must retain strict parser behavior.
