# Graph Report - Safeviate-Manager-Vercel  (2026-07-25)

## Corpus Check
- 637 files · ~503,291 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4152 nodes · 15613 edges · 226 communities (170 shown, 56 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3ce57d4`
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
- SidebarItems
- route.ts
- page.tsx
- page.tsx
- useTheme
- QualityAuditChecklistTemplate
- maplibre-map-config.ts
- openaip/route.ts
- [y]/route.ts
- weather/route.ts
- taf/route.ts
- inspections/checklists/page.tsx
- templates/page.tsx
- waypoint-coordinate-utils.ts
- waypoint-dms-dialog.tsx
- template-editor-dialog.tsx
- class-variance-authority
- clsx
- date-fns
- dotenv
- dotenv-cli
- drizzle-kit
- student-training/route.ts
- embla-carousel-react
- genkit
- @genkit-ai/next
- [capId]/page.tsx
- @hookform/resolvers
- leaflet
- triage-form.tsx
- maplibre-gl
- @neondatabase/serverless
- next
- next-auth
- next.config.ts
- SidebarItems
- pg
- @prisma/adapter-neon
- parseLocalDate
- @prisma/client
- use-map-zoom-preferences.ts
- @radix-ui/react-alert-dialog
- new-checklist-dialog.tsx
- @radix-ui/react-collapsible
- @radix-ui/react-dialog
- formatHours
- aircraft/page.tsx
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
- fleet-tracker/page.tsx
- investigation-form.tsx
- qrcode.d.ts
- vehicle-usage.ts

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 319 edges
2. `cn()` - 296 edges
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
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json

## Import Cycles
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (226 total, 56 thin omitted)

### Community 0 - "quality-audits/route.ts"
Cohesion: 0.12
Nodes (34): DELETE(), GET(), getTenantId(), PATCH(), ComplianceMatrixEntry, GET(), getTenantId(), POST() (+26 more)

### Community 1 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (33): BOOKING_TYPE_COLORS, BookingOverviewMetrics, CANCELLATION_REASON_COLORS, CompetencyArea, DASHBOARD_TABS, DashboardListCard(), DashboardListRow(), DEFAULT_INSTRUCTOR_WARNING_BANDS (+25 more)

### Community 2 - "use-user-profile.tsx"
Cohesion: 0.25
Nodes (7): getTenantOverride(), UserProfileProvider(), CacheEntry, getOrSetClientApiCache(), inflightCache, invalidateClientApiCache(), valueCache

### Community 3 - "active-flight/page.tsx"
Cohesion: 0.13
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "vehicles/[id]/page.tsx"
Cohesion: 0.17
Nodes (12): ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), INSPECTION_TYPE_OPTIONS (+4 more)

### Community 5 - "from-safety-report/route.ts"
Cohesion: 0.26
Nodes (15): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+7 more)

### Community 6 - "risk-register/page.tsx"
Cohesion: 0.11
Nodes (24): printOptions, PrintTarget, QrCodePrintMenu(), MocActions(), MocActionsProps, ApprovalForm(), MocDetailPage(), MocDetailPageProps (+16 more)

### Community 7 - "student-progress/[reportId]/page.tsx"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "simulation-lab/route.ts"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "training-records.tsx"
Cohesion: 0.21
Nodes (12): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+4 more)

### Community 10 - "development/database/database-form.tsx"
Cohesion: 0.11
Nodes (18): buildDefaultEnabledHrefs(), buildNewTenantDashboardSettings(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), isTenantMenuHref() (+10 more)

### Community 11 - "lib/utils.ts"
Cohesion: 0.07
Nodes (46): formSchema, formSchema, NewBookingFormValues, CapFormValues, capSchema, correctiveActionSchema, formSchema, FormValues (+38 more)

### Community 12 - "[projectId]/page.tsx"
Cohesion: 0.11
Nodes (25): DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge(), normalize() (+17 more)

### Community 13 - "aircraft/[id]/page.tsx"
Cohesion: 0.06
Nodes (45): ComponentForm(), ComponentFormProps, ComponentListProps, ComponentsTable(), ComponentsTableProps, AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog() (+37 more)

### Community 14 - "use-permissions.ts"
Cohesion: 0.05
Nodes (59): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), FuelStation, FuelStationInput, MassBalanceConfigPage() (+51 more)

### Community 15 - "bookings/schedule/page.tsx"
Cohesion: 0.07
Nodes (48): AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), AircraftDocuments(), parseLocalDate(), parseLocalDate(), ViewAircraftDetails() (+40 more)

### Community 16 - "getTenantIdForRoute"
Cohesion: 0.04
Nodes (86): DELETE(), getTenantId(), PATCH(), POST(), GET(), safeValue(), handler, DELETE() (+78 more)

### Community 17 - "schedule/booking-form.tsx"
Cohesion: 0.05
Nodes (69): DepartmentActionsProps, FindingLevel, RoleActionsProps, parseLocalDate(), VehicleList(), BookingBuckets, BookingsTable(), EnrichedBooking (+61 more)

### Community 18 - "coherence-matrix/page.tsx"
Cohesion: 0.17
Nodes (22): AiPopulateTarget, buildAiPopulateTargets(), buildComplianceItemIdentityKey(), CoherenceMatrixPage(), dedupeComplianceItems(), formatAiPopulateTargetLabel(), formatAuditDate(), formatParentOptionLabel() (+14 more)

### Community 19 - "react"
Cohesion: 0.21
Nodes (10): buildRiskAssessmentPath(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationFormProps, hazardIdentificationSchema, reportHazardSchema, reportRiskSchema (+2 more)

### Community 20 - "scroll-area.tsx"
Cohesion: 0.05
Nodes (35): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, WarningPeriod, DEFAULT_TOPICS, ExamTopicsSettings, Mitigation (+27 more)

### Community 21 - "booking-planning-map.tsx"
Cohesion: 0.16
Nodes (16): BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways(), formatFrequencyLabel(), formatRunwaySummary() (+8 more)

### Community 22 - "meetings/page.tsx"
Cohesion: 0.16
Nodes (21): ACTION_STATUS_OPTIONS, createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS (+13 more)

### Community 23 - "implementation-form.tsx"
Cohesion: 0.07
Nodes (24): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+16 more)

### Community 24 - "vehicle-usage/page.tsx"
Cohesion: 0.08
Nodes (39): EditVehicleDialog(), VehicleDetailPageProps, vehicleSchema, EstimatorTab(), PhasesTab(), AuditActions(), AuditActionsProps, AuditsTable() (+31 more)

### Community 25 - "Aircraft"
Cohesion: 0.10
Nodes (24): Document, ManageComponentsDialog(), parseLocalDate(), toNoonUtcIso(), cleanData(), componentSchema, ComponentsFormValues, componentsSchema (+16 more)

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
Cohesion: 0.26
Nodes (13): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+5 more)

### Community 30 - "quality.ts"
Cohesion: 0.10
Nodes (20): StatusSelectorProps, RecurringFindingPanel(), AuditChecklistItemType, AuditFinding, AuditScheduleItem, AuditScheduleStatus, AuditStatus, ClauseAnalysisEntry (+12 more)

### Community 31 - "final-review.tsx"
Cohesion: 0.09
Nodes (16): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FormValues, monitoringStatuses, reportReviewSchema, ReviewFieldsProps (+8 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "schedule/new/page.tsx"
Cohesion: 0.21
Nodes (12): AuditsPage(), ManageAreasDialog(), parseLocalDate(), RiskGroup(), RiskRegisterPage(), getAlphanumericRisk(), getRiskScoreStyle(), usePageLayout() (+4 more)

### Community 34 - "spi-card.tsx"
Cohesion: 0.12
Nodes (18): EditSpiFormProps, SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps, ReportsTableProps (+10 more)

### Community 35 - "risk-form.tsx"
Cohesion: 0.16
Nodes (15): buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor(), mapDatesToObjects(), mitigationSchema, parseLocalDate() (+7 more)

### Community 36 - "generate-checklist-flow.ts"
Cohesion: 0.12
Nodes (16): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+8 more)

### Community 37 - "asset-inspection-templates/route.ts"
Cohesion: 0.30
Nodes (14): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+6 more)

### Community 38 - "skeleton.tsx"
Cohesion: 0.06
Nodes (60): LogbookColumn, BillingTableProps, BillingTable(), BillingTableProps, parseLocalDate(), Department, Role, LogbookTemplate (+52 more)

### Community 39 - "badge.tsx"
Cohesion: 0.10
Nodes (44): BillingTable(), parseLocalDate(), DocumentExpirySettings, ComponentList(), parseLocalDate(), MaintenanceLogList(), parseLocalDate(), MaintenanceLogs() (+36 more)

### Community 40 - "flight-planner.ts"
Cohesion: 0.20
Nodes (21): NavlogBuilder(), getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle(), getBearing() (+13 more)

### Community 41 - "aircraft-inspection.ts"
Cohesion: 0.27
Nodes (13): GET(), getCurrentUser(), POST(), ensureUserSessionsSchema(), createTrackedSession(), getUserAgent(), HeaderRequest, isPrivilegedUser() (+5 more)

### Community 42 - "schedule/[id]/view-booking-details.tsx"
Cohesion: 0.10
Nodes (21): BookingDetailPage(), BookingDetailPageProps, AeronauticalMap, BookingPerson, BookingStation, BookingStationState, DEFAULT_BASIC_EMPTY, DEFAULT_GRAPH_CONFIG (+13 more)

### Community 43 - "diary-tab.tsx"
Cohesion: 0.20
Nodes (12): ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), ImportFromMatrixDialogProps, MatrixTreeNode, ComplianceItemFormProps, AiGapAnalysisGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog() (+4 more)

### Community 44 - "active-flight-live-map.tsx"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "student-progress/page.tsx"
Cohesion: 0.18
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "view-personnel-details.tsx"
Cohesion: 0.14
Nodes (18): PermissionsPage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, Document, UserProfile (+10 more)

### Community 48 - "item-form.tsx"
Cohesion: 0.21
Nodes (18): ComplianceItemForm(), ComplianceItemFormValues, formatParentOptionLabel(), headerFormSchema, itemFormSchema, normalizeLineIndentation(), normalizeRegulationCode(), normalizeResponsibleManagerId() (+10 more)

### Community 49 - "task-card-item.tsx"
Cohesion: 0.14
Nodes (14): buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), DashboardPage(), formatTrendLabel(), getDaysSince(), getInstructorLoadStatus() (+6 more)

### Community 50 - "dashboard-summary/route.ts"
Cohesion: 0.11
Nodes (35): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+27 more)

### Community 51 - "aviation-maplibre-shell.tsx"
Cohesion: 0.08
Nodes (43): formatLatLonDms(), airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm() (+35 more)

### Community 52 - "safety-reports/page.tsx"
Cohesion: 0.12
Nodes (22): ArchiveReportButton(), DepartmentOption, getSafetyReportGroup(), getStatusBadgeVariant(), isEmailLike(), normalizeSafetyReportGroup(), parseLocalDate(), QuickSafetyInbox() (+14 more)

### Community 53 - "cn"
Cohesion: 0.22
Nodes (7): FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, ActiveLegState

### Community 54 - "app-sidebar.tsx"
Cohesion: 0.09
Nodes (31): lastSubmenuByParentMemory, SidebarBrandLogoFooter(), USERS_STATIC_SUB_ITEMS, useTheme(), Sidebar, SidebarCollapsibleContent, SidebarCollapsibleTrigger, SidebarContent (+23 more)

### Community 55 - "master-graph.tsx"
Cohesion: 0.24
Nodes (11): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+3 more)

### Community 56 - "useToast"
Cohesion: 0.03
Nodes (71): DataPortabilityPage(), DatabaseForm(), DepartmentActions(), DepartmentForm(), TenantDirectory(), RoleActions(), AircraftActions(), AircraftActionsProps (+63 more)

### Community 57 - "history/[id]/view-booking-details.tsx"
Cohesion: 0.06
Nodes (37): BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey (+29 more)

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
Cohesion: 0.06
Nodes (71): POST(), POST(), POST(), POST(), POST(), POST(), POST(), DELETE() (+63 more)

### Community 63 - "task-tracker/page.tsx"
Cohesion: 0.13
Nodes (20): GapAnalysesManager(), GapAnalysisTemplateCard(), StartGapAnalysisDialog(), toNoonUtcIso(), AuditCapEntry, AuditFindingEntry, buildFindingTaskId(), formatCapDueDate() (+12 more)

### Community 64 - "corrective-actions-form.tsx"
Cohesion: 0.13
Nodes (19): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), IndependentActionFields(), independentActionSources, isIndependentAction(), isOverdueAction() (+11 more)

### Community 65 - "safety/safety-reports/[reportId]/page.tsx"
Cohesion: 0.14
Nodes (18): react, react, RiskMatrixPage(), RiskForm(), FinalReview(), HazardIdentificationForm(), RisksArray(), TaskCard() (+10 more)

### Community 66 - "session-tenant.ts"
Cohesion: 0.08
Nodes (40): GET(), buildFallbackUserIdCandidates(), buildSuperUserProfile(), buildTenantScopedMasterProfile(), GET(), canEscalateSafetyActions(), mergePermissions(), POST() (+32 more)

### Community 67 - "dependencies"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

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
Cohesion: 0.11
Nodes (34): DELETE(), GET(), getConfig(), getTenantId(), loadAircraft(), loadAudits(), loadCaps(), loadExternalOrganizations() (+26 more)

### Community 72 - "use-toast.ts"
Cohesion: 0.10
Nodes (24): CATEGORIES, ContactsTabProps, MediaTabProps, STANDARD_TEMPLATES, TYPE_ORDER, Action, ActionType, actionTypes (+16 more)

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
Cohesion: 0.21
Nodes (12): DocumentDatesPage(), FeaturesPage(), createInitialTable(), TableBuilderPage(), useDebounce(), COMPANY_DASHBOARD_VIEW_OPTIONS, COMPANY_DASHBOARD_VIEWS, CompanyDashboardView (+4 more)

### Community 78 - "mfa/route.ts"
Cohesion: 0.18
Nodes (22): GET(), getCurrentUser(), getUnauthorizedResponse(), POST(), revokeOtherSessionsForMfaChange(), createOtpAuthUri(), decodeBase32(), decryptMfaSecret() (+14 more)

### Community 79 - "PersonnelDirectoryPage"
Cohesion: 0.10
Nodes (32): POST(), DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), GET() (+24 more)

### Community 80 - "app-header.tsx"
Cohesion: 0.15
Nodes (3): DepartmentPageProps, PersonnelDirectoryPage(), RoleUsersPageProps

### Community 81 - "card.tsx"
Cohesion: 0.05
Nodes (87): defaultFindingLevels, FeatureSettings, FindingLevelsSettings, AircraftQrPageProps, INDUSTRY_TYPES, TenantConfigPayload, TenantFormProps, TenantSummary (+79 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.24
Nodes (10): clamp(), formatLitres(), normalizeFuelStation(), serializeStation(), WBCalculator(), calculateFuelGallonsFromWeight(), calculateFuelWeight(), FUEL_PRESETS (+2 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.17
Nodes (12): CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData, OpenMeteoData, WeatherCloudLayer, WeatherMetarData (+4 more)

### Community 84 - "page.tsx"
Cohesion: 0.18
Nodes (26): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+18 more)

### Community 85 - "Verification Plan"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "beta-nda.ts"
Cohesion: 0.23
Nodes (14): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+6 more)

### Community 87 - "toast.tsx"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 88 - "use-geolocation-track.ts"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 89 - "development/page.tsx"
Cohesion: 0.11
Nodes (28): POST(), GET(), loadConfig(), loadMatchingGroup(), POST(), resolveTenantId(), GET(), getTenantId() (+20 more)

### Community 90 - "Agents Contract"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "risk-assessment-dialog.tsx"
Cohesion: 0.33
Nodes (5): ToolList(), ToolList(), Tool, ToolOwnerType, ToolStatus

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
Cohesion: 0.15
Nodes (13): AdminTrainingExercisesPage(), cloneTemplates(), ExerciseReviewPage(), formatLongDate(), getInstructorRecommendationMeta(), getTrainingExerciseTemplateOptions(), resolveTrainingExerciseTemplates(), sanitizeCriterion() (+5 more)

### Community 96 - "useUserProfile"
Cohesion: 0.04
Nodes (84): AccountingPage(), AccountingPage(), DepartmentPage(), ExamTopicsPage(), ExternalOrganizationsPage(), ExternalCompaniesPage(), AdminPage(), VisibilityManager() (+76 more)

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.10
Nodes (24): FlowDefinition, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutputSchema, prompt, LogbookColumnSchema (+16 more)

### Community 98 - "alert.ts"
Cohesion: 0.08
Nodes (40): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, BookingStatus, AircraftInspectionWarningSettings (+32 more)

### Community 99 - "select.tsx"
Cohesion: 0.21
Nodes (11): ExamForm(), ExamFormProps, examFormSchema, ExamFormValues, optionSchema, questionSchema, NewExamPage(), RadioGroup (+3 more)

### Community 100 - "training-routes/route.ts"
Cohesion: 0.18
Nodes (10): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+2 more)

### Community 101 - "uploads/route.ts"
Cohesion: 0.17
Nodes (19): GET(), getTenantIdForSession(), PUT(), DELETE(), GET(), getConfig(), getTenantId(), POST() (+11 more)

### Community 102 - "chart.tsx"
Cohesion: 0.18
Nodes (8): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES, useChart()

### Community 103 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "use-dashboard-data.ts"
Cohesion: 0.29
Nodes (7): CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask, UpcomingScheduledAudit

### Community 105 - "page.tsx"
Cohesion: 0.13
Nodes (20): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TRAINING_COMPETENCY_OPTIONS, TrainingCompetencyArea, TrainingCompetencyDefinition (+12 more)

### Community 106 - "env.ts"
Cohesion: 0.44
Nodes (7): createDb(), getDb(), assertRequiredEnv(), EnvRequirement, getMissingEnvVars(), getRequirementLabel(), isProvided()

### Community 107 - "service-worker-registration.tsx"
Cohesion: 0.31
Nodes (8): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus()

### Community 108 - "bootstrap-db.ts"
Cohesion: 0.12
Nodes (34): GET(), getTenantId(), PATCH(), POST(), DELETE(), GET(), getTenantIdForSession(), PATCH() (+26 more)

### Community 109 - "**App Name**: Safeviate Manager"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

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
Cohesion: 0.50
Nodes (7): BLOCK_TAGS, extractClipboardText(), htmlToStructuredText(), normalizeClipboardText(), renderClipboardHtmlChildren(), renderClipboardHtmlNode(), stripOuterBlankLines()

### Community 117 - "button.tsx"
Cohesion: 0.09
Nodes (64): DepartmentFormProps, formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema (+56 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.60
Nodes (4): formatDate(), formatEntityType(), RecoveryArchive, RecoveryVaultPage()

### Community 126 - "RiskForm"
Cohesion: 0.44
Nodes (9): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+1 more)

### Community 127 - "react-leaflet"
Cohesion: 0.13
Nodes (25): EMPTY_SUMMARY, GET(), getMeaningfulCapActions(), hasMeaningfulCapResponses(), INSTRUCTOR_TYPES, isMeaningfulCapRowData(), normalizeCapRowData(), PERSONNEL_TYPES (+17 more)

### Community 128 - "SidebarItems"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 129 - "route.ts"
Cohesion: 0.07
Nodes (31): AddAircraftDialog(), AddComponentDialog(), toNoonUtcIso(), DocumentsTab(), parseLocalDate(), VehicleDetailPage(), VehicleDocumentsTab(), DatabasePage() (+23 more)

### Community 132 - "page.tsx"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 133 - "page.tsx"
Cohesion: 0.22
Nodes (8): AppLayout(), AppSidebar(), AppSidebarMobile(), AuthGuard(), AuthGuardProps, MfaGateStatus, SidebarInset, SidebarProvider

### Community 134 - "useTheme"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 138 - "QualityAuditChecklistTemplate"
Cohesion: 0.24
Nodes (7): StartAuditDialogProps, AiGapAnalysisGenerator(), GapAnalysisTemplateCardProps, NewGapAnalysisDialogProps, StartGapAnalysisDialogProps, TemplateEditorDialogProps, QualityAuditChecklistTemplate

### Community 139 - "maplibre-map-config.ts"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 146 - "waypoint-coordinate-utils.ts"
Cohesion: 0.27
Nodes (9): axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), normalizeSeconds(), normalizeText(), parseCoordinateDms() (+1 more)

### Community 147 - "waypoint-dms-dialog.tsx"
Cohesion: 0.24
Nodes (8): buildDecimalFromParts(), createInitialDmsState(), Hemisphere, WaypointDmsDialog(), WaypointDmsDialogProps, WaypointDmsForm(), WaypointDmsFormProps, WaypointDmsFormState

### Community 148 - "template-editor-dialog.tsx"
Cohesion: 0.22
Nodes (9): checklistItemSchema, DepartmentOption, formSchema, FormValues, sectionSchema, TemplateEditorActionArgs, TemplateEditorDialog(), toFormValues() (+1 more)

### Community 155 - "student-training/route.ts"
Cohesion: 0.42
Nodes (8): GET(), getTenantId(), PUT(), readConfig(), signatureChanged(), validateDebriefSignatureMutation(), writeConfig(), StudentProgressReport

### Community 159 - "[capId]/page.tsx"
Cohesion: 0.44
Nodes (8): parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap(), CapTaskDetailPage(), hasSavedCorrectiveAction(), isFindingRouteId(), isLocalDraftCapId(), parseFindingRouteId()

### Community 162 - "triage-form.tsx"
Cohesion: 0.25
Nodes (7): eventClassifications, ICAO_CATEGORIES, isEmailLike(), reportStatuses, resolveReporterLabel(), TriageFormValues, triageSchema

### Community 168 - "SidebarItems"
Cohesion: 0.25
Nodes (9): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), renderNestedSubItems(), setLastSubmenuByParent(), SidebarItems() (+1 more)

### Community 171 - "parseLocalDate"
Cohesion: 0.29
Nodes (8): getCapSourceDetails(), getQualityMetrics(), getSafetyMetrics(), normalizeCancellationReason(), OperationalListView(), parseLocalDate(), QualityOverviewCard(), SafetyOverviewCard()

### Community 173 - "use-map-zoom-preferences.ts"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 175 - "new-checklist-dialog.tsx"
Cohesion: 0.40
Nodes (4): AiChecklistGenerator(), AiChecklistGeneratorProps, NewChecklistDialog(), NewChecklistDialogProps

### Community 178 - "formatHours"
Cohesion: 0.67
Nodes (4): formatHours(), getStatusStyles(), InstructorLoadCard(), InstructorOverviewCard()

### Community 232 - "route-planner-maplibre-shell.tsx"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "fleet-tracker-map.tsx"
Cohesion: 0.07
Nodes (39): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+31 more)

### Community 244 - "theme-provider.tsx"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "schema.ts"
Cohesion: 0.07
Nodes (29): activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans, departments, erpState (+21 more)

### Community 289 - "audit-schedule/route.ts"
Cohesion: 0.08
Nodes (55): GET(), isBarryMasterUser(), asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH() (+47 more)

### Community 332 - "student-debriefs/new/page.tsx"
Cohesion: 0.20
Nodes (16): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues, HAZARDOUS_ATTITUDE_OPTIONS, HUMAN_FACTORS_CHECKS (+8 more)

### Community 333 - "training-exercise-analytics.ts"
Cohesion: 0.17
Nodes (17): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+9 more)

### Community 340 - "middleware.ts"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "fleet-tracker/page.tsx"
Cohesion: 0.12
Nodes (21): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, DropdownMenuCheckboxItem, SheetContent, SheetContentProps (+13 more)

### Community 353 - "investigation-form.tsx"
Cohesion: 0.05
Nodes (41): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+33 more)

## Knowledge Gaps
- **1069 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1064 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `useToast` to `route.ts`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `aircraft/[id]/page.tsx`, `use-permissions.ts`, `bookings/schedule/page.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `waypoint-dms-dialog.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `vehicle-usage/page.tsx`, `Aircraft`, `simulation-lab/page.tsx`, `template-editor-dialog.tsx`, `[capId]/page.tsx`, `final-review.tsx`, `schedule/new/page.tsx`, `triage-form.tsx`, `risk-form.tsx`, `skeleton.tsx`, `badge.tsx`, `flight-planner.ts`, `schedule/[id]/view-booking-details.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `safety-reports/page.tsx`, `history/[id]/view-booking-details.tsx`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `use-toast.ts`, `ColorThemeForm`, `student-debriefs/new/page.tsx`, `color-theme-form.tsx`, `card.tsx`, `ensureExternalOrganizationsSchema`, `exam-form.tsx`, `toast.tsx`, `app/layout.tsx`, `fleet-tracker/page.tsx`, `generate-exam-flow.ts`, `useUserProfile`, `investigation-form.tsx`, `alert.ts`, `select.tsx`, `training-routes/route.ts`, `service-worker-registration.tsx`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `cn()` connect `route.ts` to `dashboard/page.tsx`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `page.tsx`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `training-records.tsx`, `development/database/database-form.tsx`, `lib/utils.ts`, `aircraft/[id]/page.tsx`, `use-permissions.ts`, `bookings/schedule/page.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `booking-planning-map.tsx`, `implementation-form.tsx`, `vehicle-usage/page.tsx`, `Aircraft`, `final-review.tsx`, `schedule/new/page.tsx`, `triage-form.tsx`, `risk-form.tsx`, `skeleton.tsx`, `badge.tsx`, `flight-planner.ts`, `schedule/[id]/view-booking-details.tsx`, `parseLocalDate`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `task-card-item.tsx`, `formatHours`, `safety-reports/page.tsx`, `cn`, `app-sidebar.tsx`, `master-graph.tsx`, `useToast`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `menubar.tsx`, `carousel.tsx`, `cost-predictor.tsx`, `color-theme-form.tsx`, `card.tsx`, `toast.tsx`, `fleet-tracker/page.tsx`, `page.tsx`, `generate-exam-flow.ts`, `useUserProfile`, `investigation-form.tsx`, `select.tsx`, `chart.tsx`, `route-planner-maplibre-shell.tsx`, `button.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Button` connect `card.tsx` to `dashboard/page.tsx`, `route.ts`, `active-flight/page.tsx`, `vehicles/[id]/page.tsx`, `risk-register/page.tsx`, `student-progress/[reportId]/page.tsx`, `lib/utils.ts`, `[projectId]/page.tsx`, `aircraft/[id]/page.tsx`, `use-permissions.ts`, `bookings/schedule/page.tsx`, `schedule/booking-form.tsx`, `coherence-matrix/page.tsx`, `react`, `scroll-area.tsx`, `booking-planning-map.tsx`, `meetings/page.tsx`, `implementation-form.tsx`, `vehicle-usage/page.tsx`, `Aircraft`, `simulation-lab/page.tsx`, `waypoint-dms-dialog.tsx`, `aeronautical-map.tsx`, `template-editor-dialog.tsx`, `quality.ts`, `[capId]/page.tsx`, `final-review.tsx`, `schedule/new/page.tsx`, `triage-form.tsx`, `risk-form.tsx`, `skeleton.tsx`, `badge.tsx`, `schedule/[id]/view-booking-details.tsx`, `diary-tab.tsx`, `active-flight-live-map.tsx`, `student-progress/page.tsx`, `view-personnel-details.tsx`, `item-form.tsx`, `aircraft/page.tsx`, `safety-reports/page.tsx`, `cn`, `app-sidebar.tsx`, `useToast`, `history/[id]/view-booking-details.tsx`, `formatWaypointCoordinatesDms`, `task-tracker/page.tsx`, `corrective-actions-form.tsx`, `safety/safety-reports/[reportId]/page.tsx`, `use-toast.ts`, `carousel.tsx`, `student-debriefs/new/page.tsx`, `exam-form.tsx`, `risk-assessment-dialog.tsx`, `app/layout.tsx`, `fleet-tracker/page.tsx`, `page.tsx`, `investigation-form.tsx`, `alert.ts`, `select.tsx`, `training-routes/route.ts`, `route-planner-maplibre-shell.tsx`, `fleet-tracker-map.tsx`, `service-worker-registration.tsx`, `button.tsx`, `tenant-setup-presets.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1069 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `quality-audits/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11711711711711711 - nodes in this community are weakly interconnected._
- **Should `dashboard/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `active-flight/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._