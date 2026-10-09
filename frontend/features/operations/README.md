# Operations feature boundary

The Operations route is being reduced into a thin route shell.

Keep Operations code split by work surface:

- `OperationRecordSlideOver.tsx`: record create/edit slide-over.
- `OperationsMorningBriefing.tsx`: urgent command/workbench briefing surface.
- `OperationsWorkspaceTabs.tsx`: workspace/release tab navigation.
- `operationsConfig.ts`: static operation labels, empty forms, statuses.
- `operationsHelpers.ts`: pure date/email subject helpers.
- `operationsWorkflow.ts`: pure workflow helpers for email preview and bulk-save input conversion.
- `operationsReleaseModel.ts`: project-scoped release/decision/dependency/test matrix model.

Next split targets:

- command/workbench area
- release gate/test matrix
- dependency/decision log
- email preview/bulk actions
