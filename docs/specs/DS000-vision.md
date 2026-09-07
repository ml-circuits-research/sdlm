---
title: DS000-vision
summary: Defines the product outcome and supported scope.
---

## Introduction

This specification defines the product outcome and supported scope for [sdlm](../wiki.html#definition-sdlm).

## Core Content

[sdlm](../wiki.html#definition-sdlm) must give users and applications an inspectable symbolic language engine whose competence can grow through [SOP Lang](../wiki.html#definition-sop-lang) [circuits](../wiki.html#definition-semantic-circuit). The product must support explicit knowledge, reusable execution results, isolated continuing [sessions](../wiki.html#definition-session), and a testable text API.

The implementation must distinguish demonstrated [controlled-language](../wiki.html#definition-cnl) competence from general language understanding. A [circuit](../wiki.html#definition-semantic-circuit) author may add domain behavior without changing the execution architecture. The model must not claim unsupported OpenAI endpoints, unrestricted English, autonomous [circuit](../wiki.html#definition-semantic-circuit) synthesis, or production-scale evidence.

The CLI, HTML book, capability catalog and regression suite must expose concrete ways to assess the installed model. [Session](../wiki.html#definition-session) continuation must use saved symbolic state rather than replaying historical language commands. The authoritative contracts are this specification set; explanatory pages and the book must agree with them.

Conversation must attempt plausible interpretations when installed strict parsing cannot complete an input. Selected [assumptions](../wiki.html#definition-assumption) must be explicit, inspectable and correctable, with their knowledge consequences preserved across [sessions](../wiki.html#definition-session). The product favors an accountable partial attempt over a raw language-candidate error. [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) owns the implemented policies and limits.

The technical name is `sd_lm`; documentation and interfaces use **[sdlm](../wiki.html#definition-sdlm)**. The first letter means Symbolic, Small or Specific, `d` means [Datalog](../wiki.html#definition-datalog), and `lm` means Language Model.

Fresh [sessions](../wiki.html#definition-session) must include inspectable [elementary knowledge](../wiki.html#definition-base-knowledge). Evaluation must separate the fixed authored corpus from broader competence claims. Users must be able to reduce visible response detail while retaining actual [assumption](../wiki.html#definition-assumption) evidence and correction. [DS014](../specsLoader.html?spec=DS014-elementary-knowledge.md) through [DS016](../specsLoader.html?spec=DS016-response-style.md) define these contracts.
