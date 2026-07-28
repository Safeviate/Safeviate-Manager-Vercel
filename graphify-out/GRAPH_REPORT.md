# Graph Report - Safeviate-Manager-Vercel  (2026-07-28)

## Corpus Check
- 637 files · ~504,017 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4156 nodes · 15624 edges · 213 communities (159 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ec65e02`
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
- schedule/new/page.tsx
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
- session-tenant.ts
- dependencies
- [flow]/route.ts
- menubar.tsx
- resolveQuickReportContext
- recordSimulationRouteMetric
- use-toast.ts
- ColorThemeForm
- analyze-moc-flow.ts
- carousel.tsx
- cost-predictor.tsx
- color-theme-form.tsx
- mfa/route.ts
- PersonnelDirectoryPage
- app-header.tsx
- card.tsx
- ensureExternalOrganizationsSchema
- exam-form.tsx
- page.tsx
- Verification Plan
- beta-nda.ts
- toast.tsx
- use-geolocation-track.ts
- development/page.tsx
- Agents Contract
- risk-assessment-dialog.tsx
- Electronic Note: UI Source of Truth (Layout & Cards)
- app/layout.tsx
- page.tsx
- generate-exam-flow.ts
- useUserProfile
- generate-safety-protocol-recommendations.ts
- alert.ts
- select.tsx
- training-routes/route.ts
- uploads/route.ts
- chart.tsx
- next-auth.d.ts
- use-dashboard-data.ts
- page.tsx
- env.ts
- service-worker-registration.tsx
- bootstrap-db.ts
- **App Name**: Safeviate Manager
- @azure/storage-blob
- Firebase Genkit Endpoints
- Safeviate Manager
- page.tsx
- clipboard.ts
- framer-motion
- @hello-pangea/dnd
- button.tsx
- tenant-setup-presets.ts
- @radix-ui/react-avatar
- @radix-ui/react-tabs
- @radix-ui/react-toast
- part-141.ts
- RiskForm
- react-leaflet
- company-dashboard.ts
- route.ts
- react-leaflet
- waypoint-dms-dialog.tsx
- maplibre-map-config.ts
- openaip/route.ts
- [y]/route.ts
- weather/route.ts
- taf/route.ts
- inspections/checklists/page.tsx
- templates/page.tsx
- waypoint-coordinate-utils.ts
- class-variance-authority
- clsx
- date-fns
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
- pg
- @prisma/adapter-neon
- @prisma/client
- @radix-ui/react-alert-dialog
- @radix-ui/react-collapsible
- @radix-ui/react-dialog
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- attendance.ts
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
- student-debriefs/new/page.tsx
- training-exercise-analytics.ts
- middleware.ts
- fleet-tracker/page.tsx
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
9. `Badge()` - 127 edges
10. `Input` - 127 edges

## Surprising Connections (you probably didn't know these)
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useChart()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `RiskForm()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json

## Import Cycles
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (213 total, 54 thin omitted)

### Community 0 - "quality-audits/route.ts"
Cohesion: 0.10
Nodes (35): allocateNextAuditNumber(), archiveAuditSignoffAlert(), AuditSequenceTx, buildAuditeeSignoffAlert(), DELETE(), existingAuditNumber(), formatAuditSequenceNumber(), GET() (+27 more)

### Community 1 - "dashboard/page.tsx"
Cohesion: 0.05
Nodes (56): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+48 more)

### Community 2 - "use-user-profile.tsx"
Cohesion: 0.08
Nodes (39): ActivityTrackerPage(), describeChange(), formatLogTime(), MassBalanceConfigPage(), AdminPage(), PageFormatPage(), OperationsPage(), AuditChecklistsPage() (+31 more)

### Community 3 - "active-flight/page.tsx"
Cohesion: 0.15
Nodes (26): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+18 more)

### Community 4 - "vehicles/[id]/page.tsx"
Cohesion: 0.07
Nodes (32): AddComponentDialogProps, componentFormSchema, ComponentFormValues, AircraftActionsProps, AircraftFormProps, EditHoursDialogProps, formSchema, formSchema (+24 more)

### Community 5 - "from-safety-report/route.ts"
Cohesion: 0.32
Nodes (13): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+5 more)

### Community 6 - "risk-register/page.tsx"
Cohesion: 0.06
Nodes (54): ComponentFormProps, componentSchema, FormValues, AddComponentDialog(), formSchema, toNoonUtcIso(), AddMaintenanceLogDialog(), formSchema (+46 more)

### Community 7 - "student-progress/[reportId]/page.tsx"
Cohesion: 0.11
Nodes (21): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+13 more)

### Community 8 - "simulation-lab/route.ts"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "training-records.tsx"
Cohesion: 0.14
Nodes (21): GET(), getMeetingRows(), getTenantContext(), loadPersonnelMap(), MeetingAction, PATCH(), POST(), toMeetingRecord() (+13 more)

### Community 10 - "development/database/database-form.tsx"
Cohesion: 0.08
Nodes (34): defaultFindingLevels, FeatureSettings, FeaturesPage(), buildDefaultEnabledHrefs(), buildNewTenantDashboardSettings(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState() (+26 more)

### Community 11 - "lib/utils.ts"
Cohesion: 0.07
Nodes (35): FindingLevel, AuditChecklistProps, CapActionsFormProps, CapTaskDetailCard, CapTaskDetailCardHandle, parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap() (+27 more)

### Community 12 - "[projectId]/page.tsx"
Cohesion: 0.09
Nodes (30): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+22 more)

### Community 13 - "aircraft/[id]/page.tsx"
Cohesion: 0.07
Nodes (39): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+31 more)

### Community 14 - "use-permissions.ts"
Cohesion: 0.17
Nodes (12): CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData, OpenMeteoData, WeatherCloudLayer, WeatherMetarData (+4 more)

### Community 15 - "bookings/schedule/page.tsx"
Cohesion: 0.14
Nodes (21): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), AircraftBookingBlockState, AircraftInspectionStatus, getAircraftBookingBlockState() (+13 more)

### Community 16 - "getTenantIdForRoute"
Cohesion: 0.05
Nodes (71): DELETE(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), GET(), getTenantId() (+63 more)

### Community 17 - "schedule/booking-form.tsx"
Cohesion: 0.11
Nodes (31): DEFAULT_TOPICS, ExamTopicsPage(), ExamTopicsSettings, RoleActionsProps, AircraftActions(), AircraftActionsProps, AircraftTableProps, AssetInspectionsPage() (+23 more)

### Community 18 - "coherence-matrix/page.tsx"
Cohesion: 0.07
Nodes (37): Role, EXPERIMENT_LINKS, MODULE_FLOW_GROUPS, RECIPE_CARDS, AiExamGeneratorProps, EditExamPage(), EditExamPageProps, TakeExamDialogProps (+29 more)

### Community 19 - "react"
Cohesion: 0.09
Nodes (29): defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema, formSchema, FormValues, CapActionsForm(), CapFormValues (+21 more)

### Community 20 - "scroll-area.tsx"
Cohesion: 0.09
Nodes (27): clamp(), formatLitres(), FuelStation, FuelStationInput, normalizeFuelStation(), POINT_COLORS, serializeStation(), WBCalculator() (+19 more)

### Community 21 - "booking-planning-map.tsx"
Cohesion: 0.13
Nodes (19): BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways(), formatFrequencyLabel(), formatRunwaySummary() (+11 more)

### Community 22 - "meetings/page.tsx"
Cohesion: 0.11
Nodes (30): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+22 more)

### Community 23 - "implementation-form.tsx"
Cohesion: 0.06
Nodes (27): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+19 more)

### Community 24 - "vehicle-usage/page.tsx"
Cohesion: 0.18
Nodes (16): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+8 more)

### Community 25 - "Aircraft"
Cohesion: 0.11
Nodes (25): AircraftForm(), Document, ManageComponentsDialog(), parseLocalDate(), toNoonUtcIso(), parseLocalDate(), VehicleDetailPageProps, VehicleDocumentsTab() (+17 more)

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
Cohesion: 0.09
Nodes (29): DiaryTabProps, TriggersTabProps, VehicleLite, VehicleUsageLite, formSchema, NewSafetyReportFormProps, formSchema, NewSafetyReportFormProps (+21 more)

### Community 30 - "quality.ts"
Cohesion: 0.03
Nodes (105): react, react, AccountingPage(), AccountingPage(), DataPortabilityPage(), DatabaseForm(), DepartmentActions(), DepartmentForm() (+97 more)

### Community 31 - "final-review.tsx"
Cohesion: 0.09
Nodes (18): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+10 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "schedule/new/page.tsx"
Cohesion: 0.25
Nodes (8): LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutput, ParseLogbookOutputSchema, prompt

### Community 34 - "spi-card.tsx"
Cohesion: 0.15
Nodes (13): SPICard(), parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps, ReportsTableProps, CorrectiveActionsFormProps (+5 more)

### Community 35 - "risk-form.tsx"
Cohesion: 0.13
Nodes (24): MocHazard, MocMitigation, MocMitigationStatus, MocPhase, MocRisk, MocSignature, MocStatus, MocStep (+16 more)

### Community 36 - "generate-checklist-flow.ts"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "asset-inspection-templates/route.ts"
Cohesion: 0.30
Nodes (14): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+6 more)

### Community 38 - "skeleton.tsx"
Cohesion: 0.08
Nodes (39): BillingTableProps, BillingTableProps, DepartmentActionsProps, Department, NavlogBuilderProps, BookingFormProps, DebriefRoomBookingFormProps, AuditChecklistsManager() (+31 more)

### Community 39 - "badge.tsx"
Cohesion: 0.08
Nodes (52): BillingTable(), parseLocalDate(), DocumentExpirySettings, AircraftTableProps, AircraftDocuments(), AircraftDocumentsProps, parseLocalDate(), ComponentForm() (+44 more)

### Community 40 - "flight-planner.ts"
Cohesion: 0.19
Nodes (22): NavlogBuilder(), FlightPlannerPage(), getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle() (+14 more)

### Community 41 - "aircraft-inspection.ts"
Cohesion: 0.38
Nodes (4): NewBookingForm(), NewBookingFormValues, NewBookingPage(), broadcastBookingUpdate()

### Community 42 - "schedule/[id]/view-booking-details.tsx"
Cohesion: 0.08
Nodes (27): WBCalculatorContent(), BookingDetailPage(), BookingDetailPageProps, AeronauticalMap, BookingPerson, BookingStation, BookingStationState, DEFAULT_BASIC_EMPTY (+19 more)

### Community 43 - "diary-tab.tsx"
Cohesion: 0.16
Nodes (14): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), ImportFromMatrixDialogProps, MatrixTreeNode, ComplianceItemFormProps, AiGapAnalysisGeneratorProps (+6 more)

### Community 44 - "active-flight-live-map.tsx"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "student-progress/page.tsx"
Cohesion: 0.18
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "view-personnel-details.tsx"
Cohesion: 0.07
Nodes (38): PermissionsPage(), NewRolePage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, EditRolePage() (+30 more)

### Community 48 - "item-form.tsx"
Cohesion: 0.24
Nodes (9): cleanData(), componentSchema, ComponentsFormValues, componentsSchema, DetailsFormValues, detailsSchema, EditComponentsDialog(), EditDetailsDialog() (+1 more)

### Community 49 - "task-card-item.tsx"
Cohesion: 0.23
Nodes (13): BookingForm(), combineLocalDateAndTime(), getBookingRange(), parseLocalDate(), BookingItem(), BLOCKED_STATUSES, getBlockingBookingForTracking(), getBookingStartTime() (+5 more)

### Community 50 - "dashboard-summary/route.ts"
Cohesion: 0.11
Nodes (36): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+28 more)

### Community 51 - "aviation-maplibre-shell.tsx"
Cohesion: 0.08
Nodes (43): formatLatLonDms(), airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm() (+35 more)

### Community 52 - "safety-reports/page.tsx"
Cohesion: 0.10
Nodes (28): QuickSafetyReportPage(), parseLocalDate(), TechnicalReportDetailPage(), NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage(), EditReportDialog(), parseLocalDate() (+20 more)

### Community 53 - "cn"
Cohesion: 0.10
Nodes (35): POST(), GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT() (+27 more)

### Community 54 - "app-sidebar.tsx"
Cohesion: 0.07
Nodes (45): AppLayout(), AppSidebar(), AppSidebarMobile(), buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant() (+37 more)

### Community 55 - "master-graph.tsx"
Cohesion: 0.21
Nodes (12): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+4 more)

### Community 56 - "useToast"
Cohesion: 0.23
Nodes (14): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+6 more)

### Community 57 - "history/[id]/view-booking-details.tsx"
Cohesion: 0.08
Nodes (29): BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey (+21 more)

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
Cohesion: 0.21
Nodes (18): buildUserContent(), consolidateSinglePrintedImageRegulation(), extractJsonPayload(), extractSinglePrintedRegulation(), inferTechnicalStandardIndentation(), isStandaloneSubordinateMarker(), normalizeCodeFragment(), normalizeIndentationLevels() (+10 more)

### Community 62 - "prisma.ts"
Cohesion: 0.07
Nodes (61): POST(), POST(), POST(), POST(), POST(), POST(), POST(), DELETE() (+53 more)

### Community 63 - "task-tracker/page.tsx"
Cohesion: 0.18
Nodes (8): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES, useChart()

### Community 64 - "corrective-actions-form.tsx"
Cohesion: 0.12
Nodes (20): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), IndependentActionFields(), independentActionSources, isIndependentAction(), isOverdueAction() (+12 more)

### Community 65 - "safety/safety-reports/[reportId]/page.tsx"
Cohesion: 0.40
Nodes (5): isEmailLike(), resolveReporterLabel(), TriageForm(), getInitialNarrative(), normalizeForComparison()

### Community 66 - "session-tenant.ts"
Cohesion: 0.05
Nodes (68): GET(), isBarryMasterUser(), asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH() (+60 more)

### Community 67 - "dependencies"
Cohesion: 0.05
Nodes (37): @azure/storage-blob, bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, @azure/storage-blob, bcryptjs (+29 more)

### Community 68 - "[flow]/route.ts"
Cohesion: 0.33
Nodes (4): RegisteredFlowName, POST(), RouteContext, isAuthorizedForAiFlow()

### Community 69 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 70 - "resolveQuickReportContext"
Cohesion: 0.15
Nodes (24): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), ensureQuickSafetyReportsSchema() (+16 more)

### Community 71 - "recordSimulationRouteMetric"
Cohesion: 0.09
Nodes (42): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+34 more)

### Community 72 - "use-toast.ts"
Cohesion: 0.15
Nodes (17): buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor(), mapDatesToObjects(), MitigationsArray(), mitigationSchema (+9 more)

### Community 73 - "ColorThemeForm"
Cohesion: 0.19
Nodes (11): AreaActionsProps, AuditSchedulePage(), getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelector() (+3 more)

### Community 74 - "analyze-moc-flow.ts"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "carousel.tsx"
Cohesion: 0.14
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 76 - "cost-predictor.tsx"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 77 - "color-theme-form.tsx"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 78 - "mfa/route.ts"
Cohesion: 0.18
Nodes (22): GET(), getCurrentUser(), getUnauthorizedResponse(), POST(), revokeOtherSessionsForMfaChange(), createOtpAuthUri(), decodeBase32(), decryptMfaSecret() (+14 more)

### Community 79 - "PersonnelDirectoryPage"
Cohesion: 0.17
Nodes (20): DELETE(), GET(), getTenantId(), PATCH(), ComplianceMatrixEntry, GET(), getTenantId(), POST() (+12 more)

### Community 80 - "app-header.tsx"
Cohesion: 0.31
Nodes (6): LogbookColumn, calculateSpans(), HeaderCell, LogbookTemplate, TablePreview(), Progress

### Community 81 - "card.tsx"
Cohesion: 0.05
Nodes (65): BillingTable(), parseLocalDate(), ActivityLogResponse, ActivityLogRow, FindingLevelsSettings, defaultSettings, OverdueMonitorSettings, OverdueSettingsPage() (+57 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.16
Nodes (15): AccessOverviewPage(), buildAccessGroups(), flattenAccessRows(), DEFAULT_MAP_SETTINGS, MapSettings, useMapSettings(), useTabVisibility(), normalizeTenantSummary() (+7 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.33
Nodes (6): buildAssessment(), formSchema, getRiskLevel(), Mode, PersonnelOption, riskAssessmentSchema

### Community 84 - "page.tsx"
Cohesion: 0.06
Nodes (70): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+62 more)

### Community 85 - "Verification Plan"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "beta-nda.ts"
Cohesion: 0.12
Nodes (15): FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, createDeviceId(), getOrCreateDeviceBinding() (+7 more)

### Community 87 - "toast.tsx"
Cohesion: 0.10
Nodes (26): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, ASSET_TYPE_OPTIONS, AssetInspectionNewPage() (+18 more)

### Community 88 - "use-geolocation-track.ts"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 89 - "development/page.tsx"
Cohesion: 0.22
Nodes (11): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+3 more)

### Community 90 - "Agents Contract"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "risk-assessment-dialog.tsx"
Cohesion: 0.60
Nodes (4): formatDate(), formatEntityType(), RecoveryArchive, RecoveryVaultPage()

### Community 92 - "Electronic Note: UI Source of Truth (Layout & Cards)"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "app/layout.tsx"
Cohesion: 0.20
Nodes (8): GenerateSafetyProtocolRecommendationsOutput, SummarizeDocumentOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike

### Community 94 - "page.tsx"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 95 - "generate-exam-flow.ts"
Cohesion: 0.20
Nodes (11): ExerciseReviewPage(), ExerciseReviewPageProps, formatLongDate(), getInstructorRecommendationMeta(), ReviewEntry, SummaryPayload, sanitizeCriterion(), sanitizeTemplate() (+3 more)

### Community 96 - "useUserProfile"
Cohesion: 0.50
Nodes (4): parseLocalDate(), RiskGroup(), getAlphanumericRisk(), getRiskScoreStyle()

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.15
Nodes (15): FlowDefinition, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutputSchema, prompt, SummarizeDocumentInputSchema (+7 more)

### Community 98 - "alert.ts"
Cohesion: 0.60
Nodes (4): formatTick(), generateNiceTicks(), GraphPoint, MassBalanceEnvelopeChart()

### Community 99 - "select.tsx"
Cohesion: 0.10
Nodes (22): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, WarningPeriod, ExamForm(), ExamFormProps, ExamFormValues (+14 more)

### Community 100 - "training-routes/route.ts"
Cohesion: 0.13
Nodes (19): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+11 more)

### Community 101 - "uploads/route.ts"
Cohesion: 0.09
Nodes (36): GET(), buildFallbackUserIdCandidates(), buildSuperUserProfile(), buildTenantScopedMasterProfile(), GET(), canEditSafetyReports(), GET(), getTenantId() (+28 more)

### Community 102 - "chart.tsx"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 103 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "use-dashboard-data.ts"
Cohesion: 0.20
Nodes (10): MocActionsProps, ApprovalFormProps, CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask (+2 more)

### Community 105 - "page.tsx"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+2 more)

### Community 106 - "env.ts"
Cohesion: 0.21
Nodes (10): buildRiskAssessmentPath(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationFormProps, hazardIdentificationSchema, reportHazardSchema, reportRiskSchema (+2 more)

### Community 107 - "service-worker-registration.tsx"
Cohesion: 0.06
Nodes (65): ChecklistTemplateCard(), ASSET_CATEGORY_LABELS, VehicleDetailPage(), AuditActionsProps, AuditsPage(), AuditsTableProps, EnrichedAudit, EnrichedGapAnalysis (+57 more)

### Community 108 - "bootstrap-db.ts"
Cohesion: 0.12
Nodes (32): GET(), getTenantId(), PATCH(), POST(), GET(), getTenantIdForSession(), PUT(), DELETE() (+24 more)

### Community 109 - "**App Name**: Safeviate Manager"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "@azure/storage-blob"
Cohesion: 0.50
Nodes (4): createEmptyRoute(), TrainingRoutesPage(), SidebarBrandLogoFooter(), useTheme()

### Community 111 - "Firebase Genkit Endpoints"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Safeviate Manager"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 113 - "page.tsx"
Cohesion: 0.22
Nodes (9): generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutput, GenerateExamOutputSchema, optionSchema, prompt (+1 more)

### Community 114 - "clipboard.ts"
Cohesion: 0.12
Nodes (22): BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft, bookingFormSchema, BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange() (+14 more)

### Community 117 - "button.tsx"
Cohesion: 0.09
Nodes (52): DepartmentFormProps, formSchema, formSchema, formSchema, formSchema, DebriefRoomBookingDraft, DebriefRoomBookingForm(), debriefRoomBookingSchema (+44 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 126 - "RiskForm"
Cohesion: 0.44
Nodes (9): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+1 more)

### Community 127 - "react-leaflet"
Cohesion: 0.11
Nodes (32): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+24 more)

### Community 128 - "company-dashboard.ts"
Cohesion: 0.31
Nodes (8): AppHeader(), findCurrentItem(), getTitle(), Avatar, AvatarFallback, AvatarImage, SidebarTrigger, Tenant

### Community 129 - "route.ts"
Cohesion: 0.07
Nodes (32): AddAircraftDialog(), AddComponentDialog(), toNoonUtcIso(), BookingsTable(), VehicleBookingItem(), DashboardListRow(), StageCard(), StatTile() (+24 more)

### Community 138 - "waypoint-dms-dialog.tsx"
Cohesion: 0.13
Nodes (17): Hemisphere, WaypointDmsDialogProps, WaypointDmsFormProps, WaypointDmsFormState, Action, ActionType, actionTypes, addToRemoveQueue() (+9 more)

### Community 146 - "waypoint-coordinate-utils.ts"
Cohesion: 0.27
Nodes (9): axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), normalizeSeconds(), normalizeText(), parseCoordinateDms() (+1 more)

### Community 185 - "attendance.ts"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 232 - "route-planner-maplibre-shell.tsx"
Cohesion: 0.09
Nodes (42): DocumentDatesPage(), createInitialTable(), TableBuilderPage(), AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay() (+34 more)

### Community 234 - "fleet-tracker-map.tsx"
Cohesion: 0.06
Nodes (46): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+38 more)

### Community 244 - "theme-provider.tsx"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "schema.ts"
Cohesion: 0.06
Nodes (35): createDb(), getDb(), activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans (+27 more)

### Community 289 - "audit-schedule/route.ts"
Cohesion: 0.12
Nodes (40): assertActionPermission(), buildNextConfig(), changeRequestPayload(), cleanReason(), DatabaseExecutor, decideScheduleChange(), GET(), getAction() (+32 more)

### Community 332 - "student-debriefs/new/page.tsx"
Cohesion: 0.18
Nodes (19): AdminTrainingExercisesPage(), cloneTemplates(), buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues (+11 more)

### Community 333 - "training-exercise-analytics.ts"
Cohesion: 0.14
Nodes (18): AlertCard(), CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate() (+10 more)

### Community 340 - "middleware.ts"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "fleet-tracker/page.tsx"
Cohesion: 0.13
Nodes (17): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, DropdownMenuCheckboxItem (+9 more)

### Community 353 - "investigation-form.tsx"
Cohesion: 0.05
Nodes (43): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+35 more)

## Knowledge Gaps
- **1070 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1065 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `quality.ts` to `route.ts`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `use-permissions.ts`, `bookings/schedule/page.tsx`, `waypoint-dms-dialog.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `Aircraft`, `simulation-lab/page.tsx`, `ensureTenantConfigSchema`, `final-review.tsx`, `skeleton.tsx`, `badge.tsx`, `flight-planner.ts`, `aircraft-inspection.ts`, `schedule/[id]/view-booking-details.tsx`, `diary-tab.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `task-card-item.tsx`, `safety-reports/page.tsx`, `history/[id]/view-booking-details.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `use-toast.ts`, `student-debriefs/new/page.tsx`, `training-exercise-analytics.ts`, `app-header.tsx`, `card.tsx`, `exam-form.tsx`, `page.tsx`, `toast.tsx`, `development/page.tsx`, `risk-assessment-dialog.tsx`, `app/layout.tsx`, `fleet-tracker/page.tsx`, `investigation-form.tsx`, `select.tsx`, `training-routes/route.ts`, `route-planner-maplibre-shell.tsx`, `env.ts`, `service-worker-registration.tsx`, `clipboard.ts`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `cn()` connect `route.ts` to `company-dashboard.ts`, `dashboard/page.tsx`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `development/database/database-form.tsx`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `booking-planning-map.tsx`, `implementation-form.tsx`, `Aircraft`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `spi-card.tsx`, `skeleton.tsx`, `badge.tsx`, `flight-planner.ts`, `aircraft-inspection.ts`, `schedule/[id]/view-booking-details.tsx`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `task-card-item.tsx`, `safety-reports/page.tsx`, `app-sidebar.tsx`, `master-graph.tsx`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `menubar.tsx`, `use-toast.ts`, `ColorThemeForm`, `carousel.tsx`, `cost-predictor.tsx`, `student-debriefs/new/page.tsx`, `training-exercise-analytics.ts`, `app-header.tsx`, `card.tsx`, `exam-form.tsx`, `page.tsx`, `beta-nda.ts`, `toast.tsx`, `fleet-tracker/page.tsx`, `page.tsx`, `generate-exam-flow.ts`, `useUserProfile`, `investigation-form.tsx`, `alert.ts`, `route-planner-maplibre-shell.tsx`, `env.ts`, `service-worker-registration.tsx`, `@azure/storage-blob`, `clipboard.ts`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Button` connect `Aircraft` to `company-dashboard.ts`, `dashboard/page.tsx`, `route.ts`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `use-permissions.ts`, `waypoint-dms-dialog.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `simulation-lab/page.tsx`, `aeronautical-map.tsx`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `skeleton.tsx`, `badge.tsx`, `schedule/[id]/view-booking-details.tsx`, `diary-tab.tsx`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `safety-reports/page.tsx`, `app-sidebar.tsx`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `corrective-actions-form.tsx`, `use-toast.ts`, `ColorThemeForm`, `carousel.tsx`, `student-debriefs/new/page.tsx`, `training-exercise-analytics.ts`, `app-header.tsx`, `card.tsx`, `exam-form.tsx`, `page.tsx`, `beta-nda.ts`, `toast.tsx`, `development/page.tsx`, `risk-assessment-dialog.tsx`, `app/layout.tsx`, `fleet-tracker/page.tsx`, `page.tsx`, `generate-exam-flow.ts`, `investigation-form.tsx`, `alert.ts`, `select.tsx`, `training-routes/route.ts`, `route-planner-maplibre-shell.tsx`, `env.ts`, `service-worker-registration.tsx`, `fleet-tracker-map.tsx`, `clipboard.ts`, `button.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1070 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `quality-audits/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09986504723346828 - nodes in this community are weakly interconnected._
- **Should `dashboard/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05493863237872589 - nodes in this community are weakly interconnected._
- **Should `use-user-profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08376623376623377 - nodes in this community are weakly interconnected._