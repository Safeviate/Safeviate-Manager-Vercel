# Graph Report - Safeviate-Manager-Vercel  (2026-08-07)

## Corpus Check
- 639 files · ~507,794 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4177 nodes · 15683 edges · 215 communities (161 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76a13aac`
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
- react-leaflet
- select.tsx
- training-routes/route.ts
- server/booking-sequence.ts
- task-card-item.tsx
- next-auth.d.ts
- use-dashboard-data.ts
- recovery-vault/page.tsx
- attendance.ts
- maplibre-map-config.ts
- flight-sessions/route.ts
- **App Name**: Safeviate Manager
- student-training/route.ts
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
- react-leaflet
- attendance.ts
- ColorThemeForm
- route.ts
- page.tsx
- quick-reports.ts
- openaip/route.ts
- [y]/route.ts
- weather/route.ts
- taf/route.ts
- inspections/checklists/page.tsx
- templates/page.tsx
- waypoint-coordinate-utils.ts
- @azure/storage-blob
- class-variance-authority
- clsx
- formatHours
- dotenv-cli
- drizzle-kit
- calendar.tsx
- embla-carousel-react
- genkit
- @genkit-ai/next
- @hookform/resolvers
- leaflet
- resolveReporterLabel
- maplibre-gl
- @neondatabase/serverless
- next
- next-auth
- next.config.ts
- date-fns
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
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `useChart()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `CustomCalendar()` --references--> `react`  [EXTRACTED]
  src/components/ui/custom-calendar.tsx → package.json

## Import Cycles
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (215 total, 54 thin omitted)

### Community 0 - "quality-audits/route.ts"
Cohesion: 0.50
Nodes (5): addToRemoveQueue(), dispatch(), genId(), reducer(), Toast

### Community 1 - "dashboard/page.tsx"
Cohesion: 0.05
Nodes (63): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+55 more)

### Community 2 - "use-user-profile.tsx"
Cohesion: 0.05
Nodes (45): ActivityTrackerPage(), describeChange(), formatLogTime(), DepartmentPage(), ExternalCompaniesPage(), formatHistoryAmount(), formatHistoryDate(), MassBalanceConfigPage() (+37 more)

### Community 3 - "active-flight/page.tsx"
Cohesion: 0.13
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "vehicles/[id]/page.tsx"
Cohesion: 0.10
Nodes (36): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+28 more)

### Community 5 - "from-safety-report/route.ts"
Cohesion: 0.26
Nodes (15): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+7 more)

### Community 6 - "risk-register/page.tsx"
Cohesion: 0.08
Nodes (41): DELETE(), GET(), getTenantIdForSession(), PATCH(), POST(), ComplianceMatrixEntry, GET(), getConfig() (+33 more)

### Community 7 - "student-progress/[reportId]/page.tsx"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "simulation-lab/route.ts"
Cohesion: 0.08
Nodes (48): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+40 more)

### Community 9 - "training-records.tsx"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 10 - "development/database/database-form.tsx"
Cohesion: 0.11
Nodes (18): buildDefaultEnabledHrefs(), buildNewTenantDashboardSettings(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), isTenantMenuHref() (+10 more)

### Community 11 - "lib/utils.ts"
Cohesion: 0.13
Nodes (20): AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), ImportFromMatrixDialogProps, MatrixTreeNode, ComplianceItemFormProps, AiGapAnalysisGenerator(), AiGapAnalysisGeneratorProps (+12 more)

### Community 12 - "[projectId]/page.tsx"
Cohesion: 0.08
Nodes (32): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+24 more)

### Community 13 - "aircraft/[id]/page.tsx"
Cohesion: 0.07
Nodes (40): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+32 more)

### Community 14 - "use-permissions.ts"
Cohesion: 0.24
Nodes (15): POST(), GET(), getCurrentUser(), POST(), ensureUserSessionsSchema(), createTrackedSession(), getUserAgent(), HeaderRequest (+7 more)

### Community 15 - "bookings/schedule/page.tsx"
Cohesion: 0.10
Nodes (19): StatusSelectorProps, AuditChecklistItemType, AuditFinding, AuditScheduleItem, AuditScheduleStatus, AuditStatus, ClauseAnalysisEntry, CorrectiveActionStatus (+11 more)

### Community 16 - "getTenantIdForRoute"
Cohesion: 0.04
Nodes (97): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+89 more)

### Community 17 - "schedule/booking-form.tsx"
Cohesion: 0.23
Nodes (14): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+6 more)

### Community 18 - "coherence-matrix/page.tsx"
Cohesion: 0.24
Nodes (16): DELETE(), formatClientNumber(), GET(), getClientNumber(), getTenantId(), PATCH(), toRecord(), allocateNextClientNumber() (+8 more)

### Community 19 - "react"
Cohesion: 0.15
Nodes (24): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), ensureQuickSafetyReportsSchema() (+16 more)

### Community 20 - "scroll-area.tsx"
Cohesion: 0.15
Nodes (17): AlertCard(), AuditCapEntry, AuditFindingEntry, buildFindingTaskId(), formatCapDueDate(), parseCapFindingLevel(), parseCapObservation(), parseLocalDate() (+9 more)

### Community 21 - "booking-planning-map.tsx"
Cohesion: 0.09
Nodes (26): DocumentDatesPage(), BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways(), formatFrequencyLabel() (+18 more)

### Community 22 - "meetings/page.tsx"
Cohesion: 0.36
Nodes (9): createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MeetingFormDialog(), MeetingsPage(), parseLocalDate() (+1 more)

### Community 23 - "implementation-form.tsx"
Cohesion: 0.06
Nodes (28): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+20 more)

### Community 24 - "vehicle-usage/page.tsx"
Cohesion: 0.16
Nodes (18): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+10 more)

### Community 25 - "Aircraft"
Cohesion: 0.07
Nodes (51): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+43 more)

### Community 26 - "simulation-lab/page.tsx"
Cohesion: 0.11
Nodes (15): buildComparisonCsv(), buildSimulationRunCsv(), buildSimulationRunCsvRow(), EMPTY_SETTINGS, escapeCsvCell(), getComparisonInterpretation(), getDecodedAnalysis(), getObservedRequests() (+7 more)

### Community 27 - "active-flight-maplibre-shell.tsx"
Cohesion: 0.13
Nodes (28): ActiveFlightMapLibreShell(), ActiveFlightMapLibreShellProps, airspaceFeatureCollection(), bringAerialLayersToFront(), buildWaypointPopupMarkup(), escapeHtml(), FlightPosition, formatAirspaceVerticalLimits() (+20 more)

### Community 28 - "aeronautical-map.tsx"
Cohesion: 0.06
Nodes (47): AeronauticalMap(), airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, blockMapInteraction(), createOwnshipIcon(), DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS, DefaultIcon, delay() (+39 more)

### Community 29 - "ensureTenantConfigSchema"
Cohesion: 0.07
Nodes (59): BillingTableProps, Department, Role, DebriefRoomBookingFormProps, ChecklistTemplateCardProps, StartAuditDialogProps, ManageCapDialogProps, AiPopulateTarget (+51 more)

### Community 30 - "quality.ts"
Cohesion: 0.18
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 31 - "final-review.tsx"
Cohesion: 0.10
Nodes (14): ClosureMonitoringPanel(), closureStatuses, FormValues, monitoringStatuses, reportReviewSchema, ReviewFieldsProps, ReviewRiskEntry, riskReviewSchema (+6 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "schedule/new/page.tsx"
Cohesion: 0.26
Nodes (13): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+5 more)

### Community 34 - "spi-card.tsx"
Cohesion: 0.14
Nodes (15): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps (+7 more)

### Community 35 - "risk-form.tsx"
Cohesion: 0.10
Nodes (32): AssetInspectionAssetType, AssetInspectionChecklistItem, AssetInspectionChecklistPhoto, AssetInspectionOutcome, AssetInspectionRecord, AssetInspectionScope, AssetInspectionStatus, AssetInspectionTemplateItem (+24 more)

### Community 36 - "generate-checklist-flow.ts"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "asset-inspection-templates/route.ts"
Cohesion: 0.12
Nodes (22): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, SheetContent (+14 more)

### Community 38 - "skeleton.tsx"
Cohesion: 0.07
Nodes (31): FindingLevel, AuditChecklistProps, defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema, formSchema, FormValues (+23 more)

### Community 39 - "badge.tsx"
Cohesion: 0.10
Nodes (37): BillingTable(), parseLocalDate(), Document, ManageComponentsDialog(), parseLocalDate(), toNoonUtcIso(), ComponentForm(), ComponentFormProps (+29 more)

### Community 40 - "flight-planner.ts"
Cohesion: 0.23
Nodes (19): getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle(), getBearing(), getDistance() (+11 more)

### Community 41 - "aircraft-inspection.ts"
Cohesion: 0.24
Nodes (10): buildAiPopulateTargets(), CoherenceMatrixPage(), formatAiPopulateTargetLabel(), formatAuditDate(), formatParentOptionLabel(), getItemFamily(), isStructuralBrowserNode(), naturalSort() (+2 more)

### Community 42 - "schedule/[id]/view-booking-details.tsx"
Cohesion: 0.14
Nodes (14): CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask, UpcomingScheduledAudit, MeetingActionItem (+6 more)

### Community 43 - "diary-tab.tsx"
Cohesion: 0.20
Nodes (11): eventClassifications, ICAO_CATEGORIES, isEmailLike(), reportStatuses, resolveReporterLabel(), TriageForm(), TriageFormProps, TriageFormValues (+3 more)

### Community 44 - "active-flight-live-map.tsx"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "student-progress/page.tsx"
Cohesion: 0.09
Nodes (34): DebriefRoomBookingForm(), BOOKING_CATEGORY_VIEWS, BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments() (+26 more)

### Community 47 - "view-personnel-details.tsx"
Cohesion: 0.21
Nodes (10): DocumentsTabProps, REQUIRED_DOCUMENTS, ERPCollectedDocument, ERPContact, ERPContactCategory, ERPEvent, ERPEventStatus, ERPLogEntry (+2 more)

### Community 48 - "item-form.tsx"
Cohesion: 0.12
Nodes (27): AssetInspectionNewPage(), flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), ManageCapDialog(), ComplianceItemForm(), ComplianceItemFormValues (+19 more)

### Community 49 - "task-card-item.tsx"
Cohesion: 0.25
Nodes (10): FeaturesPage(), COMPANY_DASHBOARD_VIEW_OPTIONS, COMPANY_DASHBOARD_VIEWS, CompanyDashboardSettings, CompanyDashboardView, ConfigurableCompanyDashboardView, DEFAULT_COMPANY_DASHBOARD_SETTINGS, getCompanyDashboardDataRequirements() (+2 more)

### Community 50 - "dashboard-summary/route.ts"
Cohesion: 0.08
Nodes (45): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+37 more)

### Community 51 - "aviation-maplibre-shell.tsx"
Cohesion: 0.08
Nodes (43): formatLatLonDms(), airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm() (+35 more)

### Community 52 - "safety-reports/page.tsx"
Cohesion: 0.11
Nodes (21): ExamFormProps, ExerciseReviewPage(), ExerciseReviewPageProps, formatLongDate(), getInstructorRecommendationMeta(), ReviewEntry, SummaryPayload, TRAINING_EXERCISE_TEMPLATES (+13 more)

### Community 53 - "cn"
Cohesion: 0.09
Nodes (42): POST(), GET(), buildFallbackUserIdCandidates(), buildSuperUserProfile(), buildTenantScopedMasterProfile(), GET(), canManageTenantSettings(), GET() (+34 more)

### Community 54 - "app-sidebar.tsx"
Cohesion: 0.08
Nodes (38): AppSidebarMobile(), buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), lastSubmenuByParentMemory, renderNestedSubItems() (+30 more)

### Community 55 - "master-graph.tsx"
Cohesion: 0.11
Nodes (22): clamp(), formatLitres(), normalizeFuelStation(), serializeStation(), WBCalculator(), getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint (+14 more)

### Community 56 - "useToast"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+2 more)

### Community 57 - "history/[id]/view-booking-details.tsx"
Cohesion: 0.03
Nodes (75): BillingTableProps, WBCalculatorContent(), BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState (+67 more)

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
Cohesion: 0.05
Nodes (74): POST(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+66 more)

### Community 63 - "task-tracker/page.tsx"
Cohesion: 0.29
Nodes (7): isEmailLike(), resolveReporterLabel(), SafetyReportPrintPage(), SafetyReportPrintPageProps, PrintButton(), PrintButtonProps, RiskMatrixSettings

### Community 64 - "corrective-actions-form.tsx"
Cohesion: 0.13
Nodes (19): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), IndependentActionFields(), independentActionSources, isIndependentAction(), isOverdueAction() (+11 more)

### Community 65 - "safety/safety-reports/[reportId]/page.tsx"
Cohesion: 0.06
Nodes (33): react, react, RiskMatrixPage(), buildRiskAssessmentPath(), defaultTrainingClassification(), getRiskLevel(), getRiskScoreColor(), mapDatesToObjects() (+25 more)

### Community 67 - "dependencies"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

### Community 68 - "[flow]/route.ts"
Cohesion: 0.31
Nodes (8): AppHeader(), findCurrentItem(), getTitle(), Avatar, AvatarFallback, AvatarImage, DropdownMenuLabel, SidebarTrigger

### Community 69 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 70 - "resolveQuickReportContext"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 71 - "recordSimulationRouteMetric"
Cohesion: 0.10
Nodes (35): allocateNextAuditNumber(), archiveAuditSignoffAlert(), AuditSequenceTx, buildAuditeeSignoffAlert(), DELETE(), existingAuditNumber(), formatAuditSequenceNumber(), GET() (+27 more)

### Community 72 - "use-toast.ts"
Cohesion: 0.27
Nodes (9): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+1 more)

### Community 73 - "ColorThemeForm"
Cohesion: 0.05
Nodes (60): defaultFindingLevels, FeatureSettings, FindingLevelsSettings, WIDTH_PRESETS, HeaderCell, LogbookTemplate, API_DEPENDENCY_GROUPS, APP_FLOW_MAP (+52 more)

### Community 74 - "analyze-moc-flow.ts"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "carousel.tsx"
Cohesion: 0.24
Nodes (7): delay(), fetchOpenAipJson(), getCachedOpenAipResponse(), getTtlMs(), memoryCache, OpenAipCacheEntry, setCachedOpenAipResponse()

### Community 77 - "color-theme-form.tsx"
Cohesion: 0.12
Nodes (17): AircraftActions(), AircraftActionsProps, AircraftActions(), AircraftActionsProps, AircraftForm(), AircraftFormProps, AircraftTableProps, AircraftDocumentsProps (+9 more)

### Community 78 - "mfa/route.ts"
Cohesion: 0.18
Nodes (22): GET(), getCurrentUser(), getUnauthorizedResponse(), POST(), revokeOtherSessionsForMfaChange(), createOtpAuthUri(), decodeBase32(), decryptMfaSecret() (+14 more)

### Community 79 - "PersonnelDirectoryPage"
Cohesion: 0.13
Nodes (22): AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), AircraftDocuments(), parseLocalDate(), parseLocalDate(), ViewAircraftDetails() (+14 more)

### Community 80 - "corrective-action-plans/route.ts"
Cohesion: 0.25
Nodes (7): getTenantOverride(), UserProfileProvider(), CacheEntry, getOrSetClientApiCache(), inflightCache, invalidateClientApiCache(), valueCache

### Community 81 - "card.tsx"
Cohesion: 0.33
Nodes (5): AiChecklistGenerator(), ImportFromGapAnalysesDialog(), parseLocalDate(), NewChecklistDialog(), NewChecklistDialogProps

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.38
Nodes (5): NewMocForm(), NewMocFormValues, getMocPrefix(), NewMocContent(), toNoonUtcIso()

### Community 83 - "moc-lab/page.tsx"
Cohesion: 0.15
Nodes (16): CapActionsFormProps, CapTaskDetailCard, CapTaskDetailCardHandle, CapTaskDetailCardProps, parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap(), CapTaskDetailPage() (+8 more)

### Community 84 - "page.tsx"
Cohesion: 0.33
Nodes (6): createActionItem(), createDiscussionPoint(), getPersonName(), MeetingDetailPage(), parseLocalDate(), toDateInput()

### Community 85 - "Verification Plan"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "beta-nda.ts"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 87 - "toast.tsx"
Cohesion: 0.12
Nodes (22): BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft, BookingForm(), bookingFormSchema, combineLocalDateAndTime(), formatLocalDateValue(), getBookingRange() (+14 more)

### Community 88 - "use-geolocation-track.ts"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 89 - "development/page.tsx"
Cohesion: 0.25
Nodes (7): AppLayout(), AppSidebar(), AuthGuard(), AuthGuardProps, MfaGateStatus, SidebarInset, SidebarProvider

### Community 90 - "Agents Contract"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "risk-assessment-dialog.tsx"
Cohesion: 0.03
Nodes (95): AccountingPage(), AccountingPage(), DataPortabilityPage(), DatabaseForm(), DepartmentForm(), ExamTopicsPage(), ExternalOrganizationsPage(), TenantDirectory() (+87 more)

### Community 92 - "Electronic Note: UI Source of Truth (Layout & Cards)"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "app/layout.tsx"
Cohesion: 0.22
Nodes (7): SummarizeDocumentOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike

### Community 94 - "page.tsx"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 95 - "generate-exam-flow.ts"
Cohesion: 0.36
Nodes (9): AiExamGenerator(), DocumentAiGenerator(), BLOCK_TAGS, extractClipboardText(), htmlToStructuredText(), normalizeClipboardText(), renderClipboardHtmlChildren(), renderClipboardHtmlNode() (+1 more)

### Community 96 - "useUserProfile"
Cohesion: 0.07
Nodes (33): VisibilityManager(), MessagesPage(), MyDashboardPage(), parseLocalDate(), formatTimestamp(), WeatherPage(), AuditDetailPage(), parseLocalDate() (+25 more)

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.14
Nodes (16): FlowDefinition, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema, prompt (+8 more)

### Community 98 - "react-leaflet"
Cohesion: 0.60
Nodes (4): AddAircraftDialog(), AircraftFleetPage(), COMPLETED_AUDIT_STATUSES, getLastAuditDates()

### Community 99 - "select.tsx"
Cohesion: 0.33
Nodes (4): FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, ActiveLegState

### Community 100 - "training-routes/route.ts"
Cohesion: 0.33
Nodes (4): RegisteredFlowName, POST(), RouteContext, isAuthorizedForAiFlow()

### Community 101 - "server/booking-sequence.ts"
Cohesion: 0.50
Nodes (4): findMenuItem(), TenantPageAccessOptions, useTenantPageAccess(), SubMenuItem

### Community 102 - "task-card-item.tsx"
Cohesion: 0.10
Nodes (28): QuickSafetyReportPage(), parseLocalDate(), TechnicalReportDetailPage(), NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage(), EditReportDialog(), parseLocalDate() (+20 more)

### Community 103 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "use-dashboard-data.ts"
Cohesion: 0.15
Nodes (3): DepartmentPageProps, PersonnelDirectoryPage(), RoleUsersPageProps

### Community 105 - "recovery-vault/page.tsx"
Cohesion: 0.50
Nodes (4): cleanData(), EditComponentsDialog(), EditDetailsDialog(), parseLocalDate()

### Community 106 - "attendance.ts"
Cohesion: 0.50
Nodes (4): parseLocalDate(), RiskGroup(), getAlphanumericRisk(), getRiskScoreStyle()

### Community 107 - "maplibre-map-config.ts"
Cohesion: 0.05
Nodes (53): DocumentExpirySettings, PermissionsPage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, ASSET_TYPE_OPTIONS (+45 more)

### Community 108 - "flight-sessions/route.ts"
Cohesion: 0.11
Nodes (35): GET(), getTenantId(), PATCH(), POST(), DELETE(), FlightSessionPayload, FlightTrackPointPayload, GET() (+27 more)

### Community 109 - "**App Name**: Safeviate Manager"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "student-training/route.ts"
Cohesion: 0.25
Nodes (7): TaskCardItemProps, MediaAttachment, TaskCard, TaskRole, TaskSignature, Workpack, WorkpackStatus

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
Cohesion: 0.22
Nodes (9): LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutput, ParseLogbookOutputSchema (+1 more)

### Community 117 - "button.tsx"
Cohesion: 0.04
Nodes (151): DepartmentFormProps, formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema (+143 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 126 - "react-leaflet"
Cohesion: 0.50
Nodes (3): InputProps, TagInput(), TagInputProps

### Community 127 - "attendance.ts"
Cohesion: 0.67
Nodes (3): formatDate(), formatEntityType(), RecoveryVaultPage()

### Community 128 - "ColorThemeForm"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 129 - "route.ts"
Cohesion: 0.12
Nodes (29): DepartmentActions(), DepartmentActionsProps, RoleActions(), RoleActionsProps, parseLocalDate(), VehicleList(), BookingBuckets, DeleteBookingButton() (+21 more)

### Community 133 - "quick-reports.ts"
Cohesion: 0.08
Nodes (52): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+44 more)

### Community 146 - "waypoint-coordinate-utils.ts"
Cohesion: 0.27
Nodes (9): axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), normalizeSeconds(), normalizeText(), parseCoordinateDms() (+1 more)

### Community 152 - "formatHours"
Cohesion: 0.14
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 155 - "calendar.tsx"
Cohesion: 0.05
Nodes (42): parseLocalDate(), VehicleDetailPage(), VehicleDocumentsTab(), BookingsTable(), NavlogBuilder(), DatabasePage(), calculateSpans(), LogbookParserPage() (+34 more)

### Community 162 - "resolveReporterLabel"
Cohesion: 0.04
Nodes (104): BillingTable(), parseLocalDate(), ActivityLogResponse, ActivityLogRow, defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones (+96 more)

### Community 232 - "route-planner-maplibre-shell.tsx"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "fleet-tracker-map.tsx"
Cohesion: 0.10
Nodes (30): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, FleetTrackerMap(), FleetTrackerMapSettings (+22 more)

### Community 244 - "theme-provider.tsx"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "schema.ts"
Cohesion: 0.06
Nodes (35): createDb(), getDb(), activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans (+27 more)

### Community 289 - "audit-schedule/route.ts"
Cohesion: 0.08
Nodes (54): GET(), isBarryMasterUser(), asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH() (+46 more)

### Community 332 - "student-debriefs/new/page.tsx"
Cohesion: 0.19
Nodes (15): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), HAZARDOUS_ATTITUDE_OPTIONS, INSTRUCTOR_RECOMMENDATION_OPTIONS, NewDebriefContent(), TRAINING_COMPETENCY_OPTIONS (+7 more)

### Community 333 - "training-exercise-analytics.ts"
Cohesion: 0.16
Nodes (15): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+7 more)

### Community 340 - "middleware.ts"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 353 - "investigation-form.tsx"
Cohesion: 0.05
Nodes (43): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+35 more)

## Knowledge Gaps
- **1074 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1069 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `calendar.tsx` to `route.ts`, `use-user-profile.tsx`, `dashboard/page.tsx`, `active-flight/page.tsx`, `student-progress/[reportId]/page.tsx`, `training-records.tsx`, `development/database/database-form.tsx`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `scroll-area.tsx`, `booking-planning-map.tsx`, `implementation-form.tsx`, `formatHours`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `resolveReporterLabel`, `spi-card.tsx`, `asset-inspection-templates/route.ts`, `skeleton.tsx`, `badge.tsx`, `aircraft-inspection.ts`, `diary-tab.tsx`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `safety-reports/page.tsx`, `app-sidebar.tsx`, `master-graph.tsx`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `[flow]/route.ts`, `menubar.tsx`, `ColorThemeForm`, `training-exercise-analytics.ts`, `toast.tsx`, `development/page.tsx`, `risk-assessment-dialog.tsx`, `page.tsx`, `useUserProfile`, `investigation-form.tsx`, `react-leaflet`, `select.tsx`, `task-card-item.tsx`, `route-planner-maplibre-shell.tsx`, `recovery-vault/page.tsx`, `attendance.ts`, `maplibre-map-config.ts`, `button.tsx`, `tenant-setup-presets.ts`, `react-leaflet`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `useToast()` connect `risk-assessment-dialog.tsx` to `quality-audits/route.ts`, `route.ts`, `use-user-profile.tsx`, `active-flight/page.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `simulation-lab/page.tsx`, `calendar.tsx`, `ensureTenantConfigSchema`, `quality.ts`, `final-review.tsx`, `resolveReporterLabel`, `asset-inspection-templates/route.ts`, `skeleton.tsx`, `badge.tsx`, `aircraft-inspection.ts`, `diary-tab.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `task-card-item.tsx`, `dashboard-summary/route.ts`, `master-graph.tsx`, `history/[id]/view-booking-details.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `use-toast.ts`, `ColorThemeForm`, `student-debriefs/new/page.tsx`, `color-theme-form.tsx`, `PersonnelDirectoryPage`, `ensureExternalOrganizationsSchema`, `moc-lab/page.tsx`, `page.tsx`, `toast.tsx`, `app/layout.tsx`, `generate-exam-flow.ts`, `useUserProfile`, `investigation-form.tsx`, `react-leaflet`, `task-card-item.tsx`, `recovery-vault/page.tsx`, `maplibre-map-config.ts`, `button.tsx`, `tenant-setup-presets.ts`, `attendance.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `react` connect `safety/safety-reports/[reportId]/page.tsx` to `dependencies`, `button.tsx`, `app-sidebar.tsx`, `implementation-form.tsx`, `formatHours`, `risk-assessment-dialog.tsx`, `final-review.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1074 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dashboard/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.046585255540479424 - nodes in this community are weakly interconnected._
- **Should `use-user-profile.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04821802935010482 - nodes in this community are weakly interconnected._
- **Should `active-flight/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._