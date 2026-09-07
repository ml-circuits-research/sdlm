# Third-Party Components

The intended external JavaScript Datalog backend is `@suss/datalog` 0.19.0, declared in `package.json`. The runtime keeps the Datalog API behind an adapter so alternative engines can be evaluated without changing SOP authoring semantics.

No third-party Datalog source code is vendored in this archive. The build environment used for the packaged test evidence could not complete installation of the external package, so the main functional suite runs against the bundled compatibility engine. `npm run test:external` is provided as an explicit conformance gate for a network-enabled environment.

Potential alternative backends include Soufflé for high-performance compiled Datalog, Datafrog/differential-dataflow-style systems for incremental computation, and egglog for workloads combining Datalog-style reasoning with equality saturation. These are research options, not runtime requirements.
