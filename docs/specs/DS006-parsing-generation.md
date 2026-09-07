---
title: DS006-parsing-generation
summary: Defines controlled parsing, ambiguity and symbolic response generation.
---

## Introduction

This specification defines controlled parsing, ambiguity and symbolic response generation for [sdlm](../wiki.html#definition-sdlm).

## Core Content

Text must pass through installed token classification and SOP parsing [circuits](../wiki.html#definition-semantic-circuit). The implementation may use specialized micro-circuits and the generic [chart parser](../wiki.html#definition-chart-parser); neither route may bypass semantic validation. Grammar symbols and productions must use typed constructors.

Strict parsing must preserve ambiguous alternatives or produce a controlled failure. Conversation mode may select an alternative with an explicit [assumption](../wiki.html#definition-assumption) recorded before execution; it must not silently commit the choice. Search bounds limit parse recall and must remain visible as a capability boundary. A recovered construction must declare the [assumptions](../wiki.html#definition-assumption) used. An unrecovered construction must produce an unresolved result in conversation mode or a strict language failure. [DS013](../specsLoader.html?spec=DS013-assumption-guided-interpretation.md) defines fallback and correction.

Response generation must execute installed SOP response [circuits](../wiki.html#definition-semantic-circuit) over structured answers. It may use symbolic display conventions and controlled templates. Arbitrary fluent prose, unrestricted anaphora and general linguistic coverage are outside the supported contract. The example catalog must show actual recognized constructions and observable limits.

Conversation entry points must attempt supported conversational intent [circuits](../wiki.html#definition-semantic-circuit) before ordinary sentence parsing. Read-only proposals and bounded [rewrites](../wiki.html#definition-rewrite) remain subject to semantic review and transactional execution. [DS017](../specsLoader.html?spec=DS017-conversational-interaction.md) owns speaker resolution and friendly interaction.
