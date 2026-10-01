# Project flow

Use [the architecture documentation](architecture.md) and [README commands](../README.md).

App config -> bounded exploration -> draft canonical JSON -> optional Excel review -> human JSON approval -> script generation -> safe staging -> schema/static checks -> compilation -> discovery -> execution -> bounded import repair -> immutable promotion.

Every pipeline invocation creates a run manifest and validation report. No-AI mode substitutes committed model outputs while still exploring and executing the target application.
