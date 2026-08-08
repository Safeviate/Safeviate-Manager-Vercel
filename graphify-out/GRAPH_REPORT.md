# Graph Report - Safeviate-Manager-Vercel  (2026-08-08)

## Corpus Check
- 640 files · ~505,846 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4180 nodes · 15642 edges · 218 communities (160 shown, 58 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8889e84d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- quality-audits/route.ts
- dashboard/page.tsx
- use-user-profile.tsx
- active-flight/page.tsx
- vehicles/[id]/page.tsx
- from-safety-report/route.ts
- risk-register/page.tsx
- student-progress/[reportId]/page.tsx
- simulation-lab/route.ts
- training-records.tsx
- development/database/database-form.tsx
- lib/utils.ts
- [projectId]/page.tsx
- aircraft/[id]/page.tsx
- use-permissions.ts
- bookings/schedule/page.tsx
- getTenantIdForRoute
- schedule/booking-form.tsx
- coherence-matrix/page.tsx
- react
- scroll-area.tsx
- booking-planning-map.tsx
- meetings/page.tsx
- implementation-form.tsx
- vehicle-usage/page.tsx
- Aircraft
- simulation-lab/page.tsx
- active-flight-maplibre-shell.tsx
- aeronautical-map.tsx
- ensureTenantConfigSchema
- quality.ts
- final-review.tsx
- scripts
- asset-inspection-templates/route.ts
- spi-card.tsx
- risk-form.tsx
- generate-checklist-flow.ts
- asset-inspection-templates/route.ts
- skeleton.tsx
- badge.tsx
- flight-planner.ts
- aircraft-inspection.ts
- schedule/[id]/view-booking-details.tsx
- diary-tab.tsx
- active-flight-live-map.tsx
- industry-route-guard.tsx
- student-progress/page.tsx
- view-personnel-details.tsx
- item-form.tsx
- task-card-item.tsx
- dashboard-summary/route.ts
- aviation-maplibre-shell.tsx
- safety-reports/page.tsx
- cn
- app-sidebar.tsx
- master-graph.tsx
- useToast
- history/[id]/view-booking-details.tsx
- formatWaypointCoordinatesDms
- compilerOptions
- devDependencies
- summarize-document-flow.ts
- prisma.ts
- task-tracker/page.tsx
- corrective-actions-form.tsx
- safety/safety-reports/[reportId]/page.tsx
- dependencies
- [flow]/route.ts
- menubar.tsx
- resolveQuickReportContext
- recordSimulationRouteMetric
- use-toast.ts
- ColorThemeForm
- analyze-moc-flow.ts
- carousel.tsx
- color-theme-form.tsx
- mfa/route.ts
- PersonnelDirectoryPage
- corrective-action-plans/route.ts
- card.tsx
- ensureExternalOrganizationsSchema
- moc-lab/page.tsx
- page.tsx
- Verification Plan
- [capId]/page.tsx
- toast.tsx
- use-geolocation-track.ts
- compliance-matrix/route.ts
- Agents Contract
- @azure/storage-blob
- Electronic Note: UI Source of Truth (Layout & Cards)
- tools/[id]/route.ts
- page.tsx
- aircraft-inspection.ts
- student-training/route.ts
- generate-safety-protocol-recommendations.ts
- company-dashboard.ts
- workpacks/page.tsx
- audits/page.tsx
- server/booking-sequence.ts
- env.ts
- next-auth.d.ts
- use-dashboard-data.ts
- maintenance/tools/page.tsx
- MeetingDetailPage
- maplibre-map-config.ts
- flight-sessions/route.ts
- **App Name**: Safeviate Manager
- regulation-code.ts
- Firebase Genkit Endpoints
- Safeviate Manager
- attendance.ts
- clipboard.ts
- framer-motion
- @hello-pangea/dnd
- button.tsx
- tenant-setup-presets.ts
- @radix-ui/react-avatar
- @radix-ui/react-tabs
- @radix-ui/react-toast
- part-141.ts
- maintenance/tools/page.tsx
- training-routes/route.ts
- TriageForm
- ColorThemeForm
- page.tsx
- use-dashboard-data.ts
- quick-reports.ts
- RecoveryVaultPage
- NewAircraftForm
- ColorThemeForm
- TriageForm
- openaip/route.ts
- [y]/route.ts
- weather/route.ts
- taf/route.ts
- inspections/checklists/page.tsx
- templates/page.tsx
- back-navigation.ts
- useTheme
- BillingTable
- react-leaflet
- clsx
- dotenv-cli
- drizzle-kit
- embla-carousel-react
- genkit
- @genkit-ai/next
- @hookform/resolvers
- leaflet
- maplibre-gl
- @neondatabase/serverless
- next
- next-auth
- next.config.ts
- date-fns
- pg
- @prisma/adapter-neon
- @prisma/client
- lib/flight-session.ts
- @radix-ui/react-alert-dialog
- TRAINING_EXERCISE_TEMPLATES
- @radix-ui/react-collapsible
- @radix-ui/react-dialog
- booking-profile.ts
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tooltip
- react-day-picker
- react-dom
- react-hook-form
- recharts
- tailwind-merge
- uuid
- wav
- route-planner-maplibre-shell.tsx
- fleet-tracker-map.tsx
- theme-provider.tsx
- schema.ts
- placeholder-images.ts
- audit-schedule/route.ts
- middleware.ts
- investigation-form.tsx
- qrcode.d.ts
- vehicle-usage.ts

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 319 edges
2. `cn()` - 298 edges
3. `Button` - 227 edges
4. `useUserProfile()` - 194 edges
5. `Card` - 186 edges
6. `CardContent` - 172 edges
7. `usePermissions()` - 164 edges
8. `useIsMobile()` - 129 edges
9. `Badge()` - 128 edges
10. `Input` - 127 edges

## Surprising Connections (you probably didn't know these)
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `FinalReview()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `ReportForum()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/report-forum.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json

## Import Cycles
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`

## Communities (218 total, 58 thin omitted)

### Community 0 - "quality-audits/route.ts"
Cohesion: 0.50
Nodes (5): addToRemoveQueue(), dispatch(), genId(), reducer(), Toast

### Community 1 - "dashboard/page.tsx"
Cohesion: 0.06
Nodes (48): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+40 more)

### Community 2 - "use-user-profile.tsx"
Cohesion: 0.06
Nodes (55): AdminPage(), PageFormatPage(), AssetsPage(), BookingsPage(), OperationsPage(), AuditChecklistsPage(), GapAnalysesRecordsPage(), GapAnalysesPage() (+47 more)

### Community 3 - "active-flight/page.tsx"
Cohesion: 0.13
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "vehicles/[id]/page.tsx"
Cohesion: 0.22
Nodes (10): CompetencyRow(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1(), TrainingRecords() (+2 more)

### Community 5 - "from-safety-report/route.ts"
Cohesion: 0.32
Nodes (13): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+5 more)

### Community 6 - "risk-register/page.tsx"
Cohesion: 0.13
Nodes (17): FindingLevel, FindingLevelsSettings, AuditChecklist(), AuditChecklistProps, defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema (+9 more)

### Community 7 - "student-progress/[reportId]/page.tsx"
Cohesion: 0.17
Nodes (12): CompetencyHighlight, DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getProgressionStatusMeta(), PHASE_OPTIONS, PROGRESSION_STATUS_OPTIONS (+4 more)

### Community 8 - "simulation-lab/route.ts"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "training-records.tsx"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 10 - "development/database/database-form.tsx"
Cohesion: 0.11
Nodes (18): buildDefaultEnabledHrefs(), buildNewTenantDashboardSettings(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), isTenantMenuHref() (+10 more)

### Community 11 - "lib/utils.ts"
Cohesion: 0.10
Nodes (28): DepartmentActionsProps, Department, ChecklistTemplateCard(), ChecklistTemplateCardProps, ImportFromGapAnalysesDialog(), parseLocalDate(), ImportFromMatrixDialog(), NewChecklistDialog() (+20 more)

### Community 12 - "[projectId]/page.tsx"
Cohesion: 0.11
Nodes (37): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+29 more)

### Community 13 - "aircraft/[id]/page.tsx"
Cohesion: 0.07
Nodes (38): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+30 more)

### Community 14 - "use-permissions.ts"
Cohesion: 0.18
Nodes (22): GET(), getCurrentUser(), getUnauthorizedResponse(), POST(), revokeOtherSessionsForMfaChange(), createOtpAuthUri(), decodeBase32(), decryptMfaSecret() (+14 more)

### Community 15 - "bookings/schedule/page.tsx"
Cohesion: 0.07
Nodes (41): ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), INSPECTION_TYPE_OPTIONS (+33 more)

### Community 16 - "getTenantIdForRoute"
Cohesion: 0.05
Nodes (68): DELETE(), getTenantId(), PATCH(), DELETE(), getTenantId(), PATCH(), GET(), getTenantId() (+60 more)

### Community 17 - "schedule/booking-form.tsx"
Cohesion: 0.09
Nodes (31): GET(), buildFallbackUserIdCandidates(), buildSuperUserProfile(), buildTenantScopedMasterProfile(), GET(), buildTenantDefaultRoles(), canManageTenants(), DELETE() (+23 more)

### Community 18 - "coherence-matrix/page.tsx"
Cohesion: 0.22
Nodes (18): DELETE(), formatClientNumber(), GET(), getClientNumber(), getTenantId(), PATCH(), toRecord(), allocateNextClientNumber() (+10 more)

### Community 19 - "react"
Cohesion: 0.08
Nodes (52): GET(), getTenantId(), PATCH(), POST(), DELETE(), FlightSessionPayload, FlightTrackPointPayload, GET() (+44 more)

### Community 20 - "scroll-area.tsx"
Cohesion: 0.06
Nodes (66): AccountingPage(), AccountingPage(), DepartmentPage(), ExternalOrganizationsPage(), NewRolePage(), RolesPage(), EditRolePage(), AddAircraftDialog() (+58 more)

### Community 21 - "booking-planning-map.tsx"
Cohesion: 0.11
Nodes (23): BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways(), formatFrequencyLabel(), formatRunwaySummary() (+15 more)

### Community 22 - "meetings/page.tsx"
Cohesion: 0.09
Nodes (23): TECHNICAL_REPORT_WORKFLOW_STATUSES, TechnicalReportAssigneeOption, TechnicalReportDraft, ExamForm(), ExamFormProps, examFormSchema, ExamFormValues, optionSchema (+15 more)

### Community 23 - "implementation-form.tsx"
Cohesion: 0.08
Nodes (22): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationFormProps, mapDatesToObjects(), MatrixRowHeader() (+14 more)

### Community 24 - "vehicle-usage/page.tsx"
Cohesion: 0.13
Nodes (21): ExerciseProgressMatrix(), buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend() (+13 more)

### Community 25 - "Aircraft"
Cohesion: 0.12
Nodes (23): QuickSafetyReportPage(), NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage(), EditReportDialog(), parseLocalDate(), ArchiveReportButton(), DepartmentOption (+15 more)

### Community 26 - "simulation-lab/page.tsx"
Cohesion: 0.11
Nodes (15): buildComparisonCsv(), buildSimulationRunCsv(), buildSimulationRunCsvRow(), EMPTY_SETTINGS, escapeCsvCell(), getComparisonInterpretation(), getDecodedAnalysis(), getObservedRequests() (+7 more)

### Community 27 - "active-flight-maplibre-shell.tsx"
Cohesion: 0.13
Nodes (28): ActiveFlightMapLibreShell(), ActiveFlightMapLibreShellProps, airspaceFeatureCollection(), bringAerialLayersToFront(), buildWaypointPopupMarkup(), escapeHtml(), FlightPosition, formatAirspaceVerticalLimits() (+20 more)

### Community 28 - "aeronautical-map.tsx"
Cohesion: 0.06
Nodes (45): AeronauticalMap(), airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, blockMapInteraction(), createOwnshipIcon(), DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS, DefaultIcon, delay() (+37 more)

### Community 29 - "ensureTenantConfigSchema"
Cohesion: 0.05
Nodes (41): react, react, RiskMatrixPage(), buildRiskAssessmentPath(), defaultTrainingClassification(), getRiskLevel(), getRiskScoreColor(), mapDatesToObjects() (+33 more)

### Community 30 - "quality.ts"
Cohesion: 0.21
Nodes (18): ComplianceItemForm(), ComplianceItemFormValues, formatParentOptionLabel(), headerFormSchema, itemFormSchema, normalizeLineIndentation(), normalizeRegulationCode(), normalizeResponsibleManagerId() (+10 more)

### Community 31 - "final-review.tsx"
Cohesion: 0.09
Nodes (18): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+10 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "asset-inspection-templates/route.ts"
Cohesion: 0.06
Nodes (67): POST(), POST(), POST(), POST(), POST(), POST(), POST(), authorizeRoleManagement() (+59 more)

### Community 34 - "spi-card.tsx"
Cohesion: 0.18
Nodes (11): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), SpiComparison (+3 more)

### Community 35 - "risk-form.tsx"
Cohesion: 0.11
Nodes (30): clamp(), formatLitres(), FuelStation, FuelStationInput, MassBalanceConfigPage(), normalizeFuelStation(), POINT_COLORS, serializeStation() (+22 more)

### Community 36 - "generate-checklist-flow.ts"
Cohesion: 0.12
Nodes (16): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+8 more)

### Community 37 - "asset-inspection-templates/route.ts"
Cohesion: 0.15
Nodes (13): GET(), getTenantId(), FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point (+5 more)

### Community 38 - "skeleton.tsx"
Cohesion: 0.13
Nodes (8): DepartmentPageProps, PersonnelDirectoryPage(), PersonnelDirectoryPageProps, StudentProgressionRecommendation, StudentProgressionReviewRecord, UserAccessOverrides, PersonnelTable(), RoleUsersPageProps

### Community 39 - "badge.tsx"
Cohesion: 0.08
Nodes (48): DocumentExpirySettings, AircraftForm(), Document, AircraftDocuments(), parseLocalDate(), ComponentForm(), ComponentFormProps, ComponentListProps (+40 more)

### Community 40 - "flight-planner.ts"
Cohesion: 0.17
Nodes (23): NavlogBuilder(), FlightPlannerPage(), TableFooter, getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired() (+15 more)

### Community 41 - "aircraft-inspection.ts"
Cohesion: 0.13
Nodes (19): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+11 more)

### Community 42 - "schedule/[id]/view-booking-details.tsx"
Cohesion: 0.16
Nodes (21): ACTION_STATUS_OPTIONS, createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS (+13 more)

### Community 44 - "active-flight-live-map.tsx"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 45 - "industry-route-guard.tsx"
Cohesion: 0.23
Nodes (14): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+6 more)

### Community 46 - "student-progress/page.tsx"
Cohesion: 0.07
Nodes (34): GenerateExamOutput, ParseLogbookOutput, DEFAULT_TOPICS, ExamTopicsSettings, VehicleDetailPageProps, vehicleSchema, FlowKey, flowLabels (+26 more)

### Community 47 - "view-personnel-details.tsx"
Cohesion: 0.05
Nodes (45): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, DocumentDatesPage(), WarningPeriod, defaultFindingLevels, FeatureSettings (+37 more)

### Community 48 - "item-form.tsx"
Cohesion: 0.17
Nodes (22): AiPopulateTarget, buildAiPopulateTargets(), buildComplianceItemIdentityKey(), CoherenceMatrixPage(), dedupeComplianceItems(), formatAiPopulateTargetLabel(), formatAuditDate(), formatParentOptionLabel() (+14 more)

### Community 49 - "task-card-item.tsx"
Cohesion: 0.16
Nodes (14): PermissionsPage(), EditPersonnelForm(), isPilotProfile(), isPilotProfile(), parseLocalDate(), ViewPersonnelDetails(), getPermissionDisplayLabel(), PermissionDisplayLabel (+6 more)

### Community 50 - "dashboard-summary/route.ts"
Cohesion: 0.18
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 51 - "aviation-maplibre-shell.tsx"
Cohesion: 0.09
Nodes (39): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+31 more)

### Community 52 - "safety-reports/page.tsx"
Cohesion: 0.20
Nodes (15): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), HAZARDOUS_ATTITUDE_OPTIONS, INSTRUCTOR_RECOMMENDATION_OPTIONS, NewDebriefContent(), TRAINING_COMPETENCY_OPTIONS (+7 more)

### Community 53 - "cn"
Cohesion: 0.10
Nodes (34): POST(), GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT() (+26 more)

### Community 54 - "app-sidebar.tsx"
Cohesion: 0.06
Nodes (55): AppLayout(), AppHeader(), findCurrentItem(), getTitle(), AppSidebar(), AppSidebarMobile(), buildInitialOpenParents(), clearLastSubmenuByParent() (+47 more)

### Community 55 - "master-graph.tsx"
Cohesion: 0.21
Nodes (12): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+4 more)

### Community 56 - "useToast"
Cohesion: 0.10
Nodes (25): CompetencyStrip(), getCompetencySnapshot(), getCompetencyTone(), buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS (+17 more)

### Community 57 - "history/[id]/view-booking-details.tsx"
Cohesion: 0.06
Nodes (37): BookingDetailPageProps, AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey, DEFAULT_BASIC_EMPTY (+29 more)

### Community 58 - "formatWaypointCoordinatesDms"
Cohesion: 0.19
Nodes (17): BookingPlannedLegsPanel(), BookingPlannedLegsPanelProps, BookingPlanningMapProps, AeronauticalMapProps, classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines() (+9 more)

### Community 59 - "compilerOptions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 60 - "devDependencies"
Cohesion: 0.07
Nodes (26): genkit-cli, devDependencies, genkit-cli, @playwright/test, postcss, prisma, tailwindcss, @types/node (+18 more)

### Community 61 - "summarize-document-flow.ts"
Cohesion: 0.19
Nodes (19): buildUserContent(), consolidateSinglePrintedImageRegulation(), extractJsonPayload(), extractSinglePrintedRegulation(), inferTechnicalStandardIndentation(), isStandaloneSubordinateMarker(), normalizeCodeFragment(), normalizeIndentationLevels() (+11 more)

### Community 62 - "prisma.ts"
Cohesion: 0.30
Nodes (14): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+6 more)

### Community 63 - "task-tracker/page.tsx"
Cohesion: 0.04
Nodes (88): LogbookColumn, ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), defaultSettings, OverdueMonitorSettings (+80 more)

### Community 64 - "corrective-actions-form.tsx"
Cohesion: 0.11
Nodes (21): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), IndependentActionFields(), independentActionSources, isIndependentAction(), isOverdueAction() (+13 more)

### Community 65 - "safety/safety-reports/[reportId]/page.tsx"
Cohesion: 0.04
Nodes (58): DataPortabilityPage(), DatabaseForm(), DepartmentForm(), ExamTopicsPage(), OverdueSettingsPage(), TenantDirectory(), VisibilityManager(), AircraftTable() (+50 more)

### Community 67 - "dependencies"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

### Community 68 - "[flow]/route.ts"
Cohesion: 0.21
Nodes (10): AreaActionsProps, AuditSchedulePage(), getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelector() (+2 more)

### Community 69 - "menubar.tsx"
Cohesion: 0.10
Nodes (15): formatTick(), generateNiceTicks(), GraphPoint, MassBalanceEnvelopeChart(), Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem (+7 more)

### Community 70 - "resolveQuickReportContext"
Cohesion: 0.12
Nodes (23): DepartmentActions(), Role, RoleActions(), RoleActionsProps, getMenuSections(), MENU_SECTION_DEFINITIONS, RoleForm(), NewMocForm() (+15 more)

### Community 71 - "recordSimulationRouteMetric"
Cohesion: 0.10
Nodes (35): allocateNextAuditNumber(), archiveAuditSignoffAlert(), AuditSequenceTx, buildAuditeeSignoffAlert(), DELETE(), existingAuditNumber(), formatAuditSequenceNumber(), GET() (+27 more)

### Community 72 - "use-toast.ts"
Cohesion: 0.08
Nodes (35): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+27 more)

### Community 73 - "ColorThemeForm"
Cohesion: 0.07
Nodes (50): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+42 more)

### Community 74 - "analyze-moc-flow.ts"
Cohesion: 0.19
Nodes (15): analyzeMoc(), AnalyzeMocInput, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema, phaseSchema (+7 more)

### Community 75 - "carousel.tsx"
Cohesion: 0.15
Nodes (20): DebriefRoomBookingForm(), BOOKING_CATEGORY_VIEWS, BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments() (+12 more)

### Community 77 - "color-theme-form.tsx"
Cohesion: 0.44
Nodes (8): BLOCKED_STATUSES, getBlockingBookingForTracking(), getBookingStartTime(), getTrackableBookings(), hasEarlierBlockingBooking(), isBookingEligibleForTracking(), isTrackableBookingStatus(), TRACKABLE_STATUSES

### Community 78 - "mfa/route.ts"
Cohesion: 0.12
Nodes (29): BillingTableProps, BillingTable(), BillingTableProps, parseLocalDate(), AircraftActionsProps, AircraftFormProps, AircraftTableProps, AircraftDocumentsProps (+21 more)

### Community 79 - "PersonnelDirectoryPage"
Cohesion: 0.08
Nodes (39): GET(), isBarryMasterUser(), POST(), POST(), GET(), safeValue(), handler, GET() (+31 more)

### Community 80 - "corrective-action-plans/route.ts"
Cohesion: 0.17
Nodes (12): CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData, OpenMeteoData, WeatherCloudLayer, WeatherMetarData (+4 more)

### Community 81 - "card.tsx"
Cohesion: 0.20
Nodes (11): formatDateLabel(), formatDaysSince(), formatHours(), formatPace(), getCompetencyTone(), getStatusStyles(), getStudentCompetencySnapshot(), getStudentStatusStyles() (+3 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.44
Nodes (9): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+1 more)

### Community 83 - "moc-lab/page.tsx"
Cohesion: 0.07
Nodes (32): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialogProps, ComplianceItemFormProps, AiGapAnalysisGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialogProps (+24 more)

### Community 84 - "page.tsx"
Cohesion: 0.36
Nodes (9): AiExamGenerator(), DocumentAiGenerator(), BLOCK_TAGS, extractClipboardText(), htmlToStructuredText(), normalizeClipboardText(), renderClipboardHtmlChildren(), renderClipboardHtmlNode() (+1 more)

### Community 85 - "Verification Plan"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "[capId]/page.tsx"
Cohesion: 0.13
Nodes (18): CapActionsFormProps, EnrichedGapAnalysis, CapTaskDetailCard, CapTaskDetailCardHandle, CapTaskDetailCardProps, parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap() (+10 more)

### Community 87 - "toast.tsx"
Cohesion: 0.13
Nodes (14): AeronauticalMap, BookingPerson, BookingStation, BookingStationState, DEFAULT_BASIC_EMPTY, DEFAULT_GRAPH_CONFIG, formatDateSafe(), getStatusLabel() (+6 more)

### Community 88 - "use-geolocation-track.ts"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 89 - "compliance-matrix/route.ts"
Cohesion: 0.25
Nodes (21): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+13 more)

### Community 90 - "Agents Contract"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 92 - "Electronic Note: UI Source of Truth (Layout & Cards)"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "tools/[id]/route.ts"
Cohesion: 0.22
Nodes (12): AuditCapEntry, AuditFindingEntry, buildFindingTaskId(), formatCapDueDate(), parseCapFindingLevel(), parseCapObservation(), parseLocalDate(), TaskTrackerPage() (+4 more)

### Community 94 - "page.tsx"
Cohesion: 0.07
Nodes (31): AddToolDialog(), ToolsPage(), ToolList(), CompanyDocument, VehicleLite, VehicleUsageLite, FormValues, HazardIdentificationFormProps (+23 more)

### Community 95 - "aircraft-inspection.ts"
Cohesion: 0.11
Nodes (26): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), DocumentsTab(), VehicleDocumentsTab(), CompanyDocumentsPage() (+18 more)

### Community 96 - "student-training/route.ts"
Cohesion: 0.33
Nodes (8): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus()

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.10
Nodes (25): FlowDefinition, AnalyzeMocInputSchema, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema (+17 more)

### Community 98 - "company-dashboard.ts"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 99 - "workpacks/page.tsx"
Cohesion: 0.25
Nodes (7): AddWorkpackDialog(), WorkpackList(), MediaAttachment, TaskRole, TaskSignature, Workpack, WorkpackStatus

### Community 100 - "audits/page.tsx"
Cohesion: 0.28
Nodes (8): AuditActionsProps, AuditsTable(), AuditsTableProps, EnrichedAudit, getStatusBadgeVariant(), parseLocalDate(), ArchiveActionButton(), ViewActionButton()

### Community 101 - "server/booking-sequence.ts"
Cohesion: 0.25
Nodes (8): generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutputSchema, optionSchema, prompt, questionSchema

### Community 102 - "env.ts"
Cohesion: 0.44
Nodes (7): createDb(), getDb(), assertRequiredEnv(), EnvRequirement, getMissingEnvVars(), getRequirementLabel(), isProvided()

### Community 103 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "use-dashboard-data.ts"
Cohesion: 0.44
Nodes (7): DELETE(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureToolsSchema()

### Community 105 - "maintenance/tools/page.tsx"
Cohesion: 0.29
Nodes (7): CapActionsForm(), parseLocalDate(), toNoonUtcIso(), ManageCapDialog(), getPersonnelDisplayName(), normalizeLookupValue(), PersonnelLike

### Community 106 - "MeetingDetailPage"
Cohesion: 0.33
Nodes (6): createActionItem(), createDiscussionPoint(), getPersonName(), MeetingDetailPage(), parseLocalDate(), toDateInput()

### Community 107 - "maplibre-map-config.ts"
Cohesion: 0.11
Nodes (31): parseLocalDate(), VehicleList(), BookingBuckets, DeleteBookingButton(), EnrichedBooking, mandatoryOnboardDocuments, Stage, stages (+23 more)

### Community 108 - "flight-sessions/route.ts"
Cohesion: 0.14
Nodes (25): DELETE(), GET(), getTenantIdForSession(), PATCH(), POST(), GET(), getTenantIdForSession(), PUT() (+17 more)

### Community 109 - "**App Name**: Safeviate Manager"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "regulation-code.ts"
Cohesion: 0.47
Nodes (5): normalizeIndentationArray(), normalizeIndentationValue(), normalizeRegulationClipboardText(), normalizeRegulationCodeInternal(), regulationMarkerIndent()

### Community 111 - "Firebase Genkit Endpoints"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Safeviate Manager"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 113 - "attendance.ts"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 114 - "clipboard.ts"
Cohesion: 0.08
Nodes (39): EstimatorTab(), PhasesTab(), printOptions, PrintTarget, QrCodePrintMenu(), MocActions(), MocActionsProps, ApprovalForm() (+31 more)

### Community 117 - "button.tsx"
Cohesion: 0.06
Nodes (118): DepartmentFormProps, formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema (+110 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 127 - "training-routes/route.ts"
Cohesion: 0.31
Nodes (6): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES

### Community 128 - "TriageForm"
Cohesion: 0.10
Nodes (23): EditReportDialogProps, ReportsTableProps, CorrectiveActionsFormProps, FinalReviewProps, InvestigationFormProps, ReportForumProps, eventClassifications, ICAO_CATEGORIES (+15 more)

### Community 132 - "use-dashboard-data.ts"
Cohesion: 0.18
Nodes (13): MessagesPage(), MyDashboardPage(), parseLocalDate(), parseLocalDate(), TasksPage(), CapTaskSummary, isSummaryPerson(), SummaryPerson (+5 more)

### Community 133 - "quick-reports.ts"
Cohesion: 0.07
Nodes (53): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+45 more)

### Community 134 - "RecoveryVaultPage"
Cohesion: 0.67
Nodes (3): formatDate(), formatEntityType(), RecoveryVaultPage()

### Community 138 - "ColorThemeForm"
Cohesion: 0.04
Nodes (50): ExternalCompaniesPage(), formatHistoryAmount(), formatHistoryDate(), AdminTrainingExercisesPage(), cloneTemplates(), AddComponentDialog(), toNoonUtcIso(), ComponentsTab() (+42 more)

### Community 139 - "TriageForm"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 146 - "back-navigation.ts"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 147 - "useTheme"
Cohesion: 0.67
Nodes (3): AssetInspectionsPage(), formatInspectionDate(), getStatusBadgeClass()

### Community 173 - "lib/flight-session.ts"
Cohesion: 0.19
Nodes (14): formatLatLonDms(), axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), formatWaypointCoordinatesDms(), normalizeSeconds() (+6 more)

### Community 175 - "TRAINING_EXERCISE_TEMPLATES"
Cohesion: 0.12
Nodes (17): AircraftActions(), AircraftActionsProps, AircraftTableProps, ExternalUsersTable(), ExternalUsersTableProps, UserProfile, InstructorsTable(), InstructorsTableProps (+9 more)

### Community 179 - "booking-profile.ts"
Cohesion: 0.33
Nodes (4): RegisteredFlowName, POST(), RouteContext, isAuthorizedForAiFlow()

### Community 232 - "route-planner-maplibre-shell.tsx"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "fleet-tracker-map.tsx"
Cohesion: 0.06
Nodes (45): FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS (+37 more)

### Community 244 - "theme-provider.tsx"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "schema.ts"
Cohesion: 0.07
Nodes (29): activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans, departments, erpState (+21 more)

### Community 289 - "audit-schedule/route.ts"
Cohesion: 0.10
Nodes (46): asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH(), restoreArchive(), assertActionPermission() (+38 more)

### Community 340 - "middleware.ts"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 353 - "investigation-form.tsx"
Cohesion: 0.05
Nodes (42): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+34 more)

## Knowledge Gaps
- **1076 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1071 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `safety/safety-reports/[reportId]/page.tsx` to `TriageForm`, `ColorThemeForm`, `quality-audits/route.ts`, `active-flight/page.tsx`, `RecoveryVaultPage`, `NewAircraftForm`, `risk-register/page.tsx`, `ColorThemeForm`, `development/database/database-form.tsx`, `lib/utils.ts`, `aircraft/[id]/page.tsx`, `bookings/schedule/page.tsx`, `useTheme`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `Aircraft`, `simulation-lab/page.tsx`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `risk-form.tsx`, `badge.tsx`, `flight-planner.ts`, `aircraft-inspection.ts`, `schedule/[id]/view-booking-details.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `TRAINING_EXERCISE_TEMPLATES`, `item-form.tsx`, `dashboard-summary/route.ts`, `task-card-item.tsx`, `safety-reports/page.tsx`, `history/[id]/view-booking-details.tsx`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `resolveQuickReportContext`, `use-toast.ts`, `carousel.tsx`, `corrective-action-plans/route.ts`, `page.tsx`, `[capId]/page.tsx`, `toast.tsx`, `tools/[id]/route.ts`, `page.tsx`, `aircraft-inspection.ts`, `student-training/route.ts`, `investigation-form.tsx`, `workpacks/page.tsx`, `audits/page.tsx`, `maintenance/tools/page.tsx`, `fleet-tracker-map.tsx`, `maplibre-map-config.ts`, `MeetingDetailPage`, `clipboard.ts`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `cn()` connect `ColorThemeForm` to `TriageForm`, `dashboard/page.tsx`, `active-flight/page.tsx`, `use-dashboard-data.ts`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `training-records.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `TriageForm`, `aircraft/[id]/page.tsx`, `bookings/schedule/page.tsx`, `BillingTable`, `scroll-area.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `vehicle-usage/page.tsx`, `Aircraft`, `booking-planning-map.tsx`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `spi-card.tsx`, `risk-form.tsx`, `asset-inspection-templates/route.ts`, `badge.tsx`, `flight-planner.ts`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `task-card-item.tsx`, `dashboard-summary/route.ts`, `TRAINING_EXERCISE_TEMPLATES`, `app-sidebar.tsx`, `master-graph.tsx`, `useToast`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `[flow]/route.ts`, `menubar.tsx`, `resolveQuickReportContext`, `use-toast.ts`, `carousel.tsx`, `mfa/route.ts`, `card.tsx`, `[capId]/page.tsx`, `toast.tsx`, `tools/[id]/route.ts`, `page.tsx`, `aircraft-inspection.ts`, `investigation-form.tsx`, `audits/page.tsx`, `route-planner-maplibre-shell.tsx`, `maintenance/tools/page.tsx`, `fleet-tracker-map.tsx`, `maplibre-map-config.ts`, `clipboard.ts`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `Button` connect `task-tracker/page.tsx` to `TriageForm`, `dashboard/page.tsx`, `use-user-profile.tsx`, `active-flight/page.tsx`, `use-dashboard-data.ts`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `lib/utils.ts`, `TriageForm`, `aircraft/[id]/page.tsx`, `bookings/schedule/page.tsx`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `Aircraft`, `simulation-lab/page.tsx`, `aeronautical-map.tsx`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `risk-form.tsx`, `asset-inspection-templates/route.ts`, `skeleton.tsx`, `badge.tsx`, `flight-planner.ts`, `aircraft-inspection.ts`, `schedule/[id]/view-booking-details.tsx`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `TRAINING_EXERCISE_TEMPLATES`, `dashboard-summary/route.ts`, `app-sidebar.tsx`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `corrective-actions-form.tsx`, `[flow]/route.ts`, `menubar.tsx`, `resolveQuickReportContext`, `use-toast.ts`, `carousel.tsx`, `corrective-action-plans/route.ts`, `moc-lab/page.tsx`, `[capId]/page.tsx`, `toast.tsx`, `tools/[id]/route.ts`, `page.tsx`, `student-training/route.ts`, `investigation-form.tsx`, `audits/page.tsx`, `route-planner-maplibre-shell.tsx`, `fleet-tracker-map.tsx`, `maplibre-map-config.ts`, `clipboard.ts`, `button.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1076 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dashboard/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05803921568627451 - nodes in this community are weakly interconnected._
- **Should `use-user-profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06383619391749473 - nodes in this community are weakly interconnected._
- **Should `active-flight/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._