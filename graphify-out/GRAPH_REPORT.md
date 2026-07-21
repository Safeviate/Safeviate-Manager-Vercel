# Graph Report - Safeviate-Manager-Vercel  (2026-07-21)

## Corpus Check
- 623 files · ~488,406 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4037 nodes · 15205 edges · 207 communities (153 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a61198c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 78
- react-leaflet
- Community 80
- Community 81
- ensureExternalOrganizationsSchema
- exam-form.tsx
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- manage-cap-dialog.tsx
- Community 92
- Community 93
- page.tsx
- generate-exam-flow.ts
- Community 96
- generate-safety-protocol-recommendations.ts
- alert.ts
- Community 99
- Community 100
- Community 101
- chart.tsx
- Community 103
- Community 104
- page.tsx
- page.tsx
- Community 107
- Community 108
- Community 109
- @azure/storage-blob
- Community 111
- Community 112
- page.tsx
- Community 114
- Community 115
- Community 116
- Community 117
- tenant-setup-presets.ts
- Community 119
- Community 120
- Community 121
- Community 122
- page.tsx
- react-leaflet
- SidebarItems
- route.ts
- formatHours
- table-template.ts
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 156
- Community 157
- Community 158
- Community 160
- Community 161
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 169
- Community 170
- Community 172
- Community 174
- Community 176
- Community 177
- Community 181
- Community 182
- Community 183
- Community 184
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 194
- Community 195
- Community 197
- Community 198
- Community 232
- Community 234
- Community 242
- Community 244
- Community 251
- Community 284
- Community 289
- Community 332
- Community 333
- Community 340
- Community 349
- Community 353
- Community 355
- Community 397

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 317 edges
2. `cn()` - 295 edges
3. `Button` - 226 edges
4. `useUserProfile()` - 192 edges
5. `Card` - 184 edges
6. `CardContent` - 170 edges
7. `usePermissions()` - 162 edges
8. `useIsMobile()` - 127 edges
9. `Badge()` - 125 edges
10. `Input` - 125 edges

## Surprising Connections (you probably didn't know these)
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `RiskMatrixPage()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-matrix/page.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `RiskForm()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json

## Import Cycles
- 1-file cycle: `src/lib/placeholder-images.ts -> src/lib/placeholder-images.ts`
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
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (207 total, 54 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (33): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), allocateNextAuditNumber() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (33): BOOKING_TYPE_COLORS, BookingOverviewMetrics, CANCELLATION_REASON_COLORS, CompetencyArea, DASHBOARD_TABS, DashboardListCard(), DashboardListRow(), DEFAULT_INSTRUCTOR_WARNING_BANDS (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (73): Department, FindingLevelsSettings, AircraftFleetPage(), COMPLETED_AUDIT_STATUSES, getLastAuditDates(), ChecklistTemplateCard(), ChecklistTemplateCardProps, NewChecklistDialogProps (+65 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (10): ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), INSPECTION_TYPE_OPTIONS (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.26
Nodes (15): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (30): AlertForm(), AlertsPage(), printOptions, PrintTarget, QrCodePrintMenu(), MocActions(), ApprovalForm(), MocDetailPage() (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (14): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (13): buildDefaultEnabledHrefs(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), INDUSTRY_TYPES, isTenantMenuHref(), normalizeTenantConfig() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (76): DatabaseForm(), formSchema, NewBookingFormValues, Cell, createInitialTable(), PublishDialog(), TableBuilderPage(), TableData (+68 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (39): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+31 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (39): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+31 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (62): AdminPage(), VisibilityManager(), OperationsPage(), CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData (+54 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (28): DebriefRoomBookingForm(), BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments(), getDatesInRangeInclusive() (+20 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (80): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+72 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (22): DepartmentActionsProps, RoleActionsProps, parseLocalDate(), VehicleList(), BookingBuckets, BookingsHistoryPage(), BookingsTable(), EnrichedBooking (+14 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (41): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialog(), ImportFromGapAnalysesDialogProps, parseLocalDate(), ImportFromMatrixDialog(), ImportFromMatrixDialogProps, NewChecklistDialog() (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (21): react, react, buildRiskAssessmentPath(), deriveCorrectiveActionsFromHazards(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationForm() (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (30): BillingTableProps, AircraftActions(), DebriefRoomBookingFormProps, AuditCapEntry, AuditFindingEntry, buildFindingTaskId(), formatCapDueDate(), parseCapFindingLevel() (+22 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (18): DocumentDatesPage(), FeaturesPage(), BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways() (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (30): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (24): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.30
Nodes (14): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (30): BillingTableProps, BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS (+22 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (15): buildComparisonCsv(), buildSimulationRunCsv(), buildSimulationRunCsvRow(), EMPTY_SETTINGS, escapeCsvCell(), getComparisonInterpretation(), getDecodedAnalysis(), getObservedRequests() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (28): ActiveFlightMapLibreShell(), ActiveFlightMapLibreShellProps, airspaceFeatureCollection(), bringAerialLayersToFront(), buildWaypointPopupMarkup(), escapeHtml(), FlightPosition, formatAirspaceVerticalLimits() (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (45): AeronauticalMap(), airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, blockMapInteraction(), createOwnshipIcon(), DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS, DefaultIcon, delay() (+37 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (33): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (11): parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap(), CapTaskDetailPage(), hasSavedCorrectiveAction(), isFindingRouteId(), isLocalDraftCapId(), parseFindingRouteId() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (17): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (33): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft (+25 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (19): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (16): buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor(), mapDatesToObjects(), mitigationSchema, parseLocalDate() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (37): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+29 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (36): FindingLevel, AlertCard(), AuditChecklist(), AuditChecklistProps, defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema (+28 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (36): BillingTable(), parseLocalDate(), DocumentExpirySettings, AircraftDocuments(), parseLocalDate(), ComponentForm(), ComponentFormProps, ComponentList() (+28 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (19): getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle(), getBearing(), getDistance() (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (39): NavlogBuilder(), AeronauticalMap, FlightPlannerPage(), createEmptyRoute(), TrainingRoutesPage(), formatLatLonDms(), BookingPlannedLegsPanel(), BookingPlannedLegsPanelProps (+31 more)

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (36): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+28 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): isEmailLike(), resolveReporterLabel(), SafetyReportPrintPage(), SafetyReportPrintPageProps, PublicReportLandingProps, qrPrintSizes, PrintButton(), PrintButtonProps (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (24): PermissionsPage(), NewRolePage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, LogbookTemplate (+16 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (19): BillingTable(), parseLocalDate(), AccountingPage(), AddToolDialog(), ToolsPage(), ToolList(), Mitigation, PhaseItem (+11 more)

### Community 49 - "Community 49"
Cohesion: 0.44
Nodes (9): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (42): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+34 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (45): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+37 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (24): QuickSafetyReportPage(), parseLocalDate(), TechnicalReportDetailPage(), EditReportDialog(), parseLocalDate(), ArchiveReportButton(), DepartmentOption, getSafetyReportGroup() (+16 more)

### Community 53 - "Community 53"
Cohesion: 0.21
Nodes (12): AdminTrainingExercisesPage(), cloneTemplates(), ExerciseReviewPage(), formatLongDate(), getInstructorRecommendationMeta(), resolveTrainingExerciseTemplates(), sanitizeCriterion(), sanitizeTemplate() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (29): lastSubmenuByParentMemory, SidebarBrandLogoFooter(), USERS_STATIC_SUB_ITEMS, Sidebar, SidebarCollapsibleContent, SidebarCollapsibleTrigger, SidebarContent, SidebarFooter (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (14): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.05
Nodes (55): DepartmentFormProps, FuelStation, FuelStationInput, MassBalanceConfigPage(), POINT_COLORS, defaultSettings, OverdueMonitorSettings, EstimatorTab() (+47 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (26): WBCalculatorContent(), BookingDetailPage(), BookingDetailPageProps, AeronauticalMap, BookingPerson, BookingStation, BookingStationState, DEFAULT_BASIC_EMPTY (+18 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (16): formSchema, FormValues, NewAircraftForm(), Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+8 more)

### Community 59 - "Community 59"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 60 - "Community 60"
Cohesion: 0.07
Nodes (26): genkit-cli, devDependencies, genkit-cli, @playwright/test, postcss, prisma, tailwindcss, @types/node (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (13): buildUserContent(), extractJsonPayload(), isStandaloneSubordinateMarker(), normalizeCodeFragment(), OpenAiRequirementSchema, OpenAiSummarizeDocumentOutputSchema, parseFallbackTextRequirements(), RegulationSchema (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.05
Nodes (81): POST(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+73 more)

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (20): parseLocalDate(), VehicleDetailPage(), VehicleDocumentsTab(), NewBookingForm(), NewBookingForm(), StatusSelector(), MitigationsArray(), ReviewFields() (+12 more)

### Community 64 - "Community 64"
Cohesion: 0.20
Nodes (13): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), likelihoodLabels, mitigationReviewSchema, normalizeRiskAssessment(), parseLocalDate() (+5 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (36): GET(), isBarryMasterUser(), POST(), readHeader(), GET(), GET(), buildFallbackUserIdCandidates(), buildSuperUserProfile() (+28 more)

### Community 67 - "Community 67"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (4): RegisteredFlowName, POST(), RouteContext, isAuthorizedForAiFlow()

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (32): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), buildTenantDefaultRoles() (+24 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (42): GET(), getMeetingRows(), getTenantContext(), loadPersonnelMap(), MeetingAction, PATCH(), POST(), toMeetingRecord() (+34 more)

### Community 72 - "Community 72"
Cohesion: 0.21
Nodes (16): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues, HAZARDOUS_ATTITUDE_OPTIONS, HUMAN_FACTORS_CHECKS (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.11
Nodes (12): EditVehicleDialog(), VehicleDetailPageProps, vehicleSchema, quickSafetySchema, QuickSafetyValues, QuickTechnicalReportPage(), technicalReportSchema, TechnicalReportValues (+4 more)

### Community 79 - "react-leaflet"
Cohesion: 0.22
Nodes (8): AreaActionsProps, INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelectorProps, AuditScheduleItem, AuditScheduleStatus

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): AppLayout(), AppSidebar(), AppSidebarMobile(), SidebarContext, SidebarInset, SidebarProvider, useSidebar()

### Community 81 - "Community 81"
Cohesion: 0.07
Nodes (62): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), DEFAULT_TOPICS, ExamTopicsPage(), ExamTopicsSettings (+54 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.18
Nodes (13): clamp(), formatLitres(), normalizeFuelStation(), serializeStation(), WBCalculator(), calculateFuelGallonsFromWeight(), calculateFuelWeight(), FUEL_PRESETS (+5 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.12
Nodes (17): calculateSpans(), HeaderCell, LogbookParserPage(), TablePreview(), AiExamGeneratorProps, ExamForm(), examFormSchema, ExamFormValues (+9 more)

### Community 84 - "Community 84"
Cohesion: 0.14
Nodes (14): buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), DashboardPage(), formatTrendLabel(), getDaysSince(), getInstructorLoadStatus() (+6 more)

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "Community 86"
Cohesion: 0.22
Nodes (9): LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutput, ParseLogbookOutputSchema (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.04
Nodes (58): DataPortabilityPage(), OverdueSettingsPage(), TenantDirectory(), AddAircraftDialog(), AddComponentDialog(), toNoonUtcIso(), AircraftForm(), AircraftTable() (+50 more)

### Community 89 - "Community 89"
Cohesion: 0.13
Nodes (19): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+11 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "manage-cap-dialog.tsx"
Cohesion: 0.15
Nodes (13): AircraftActionsProps, AircraftActionsProps, AircraftFormProps, AircraftTableProps, AircraftDocumentsProps, EditHoursDialogProps, ViewAircraftDetailsProps, AircraftTableProps (+5 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "Community 93"
Cohesion: 0.22
Nodes (7): SummarizeDocumentOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike

### Community 94 - "page.tsx"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 95 - "generate-exam-flow.ts"
Cohesion: 0.22
Nodes (9): generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutput, GenerateExamOutputSchema, optionSchema, prompt (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.04
Nodes (81): AccountingPage(), DepartmentActions(), DepartmentForm(), DepartmentPage(), ExternalOrganizationsPage(), ExternalCompaniesPage(), PageFormatPage(), RolesPage() (+73 more)

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.24
Nodes (9): FlowDefinition, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema, prompt (+1 more)

### Community 98 - "alert.ts"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (10): eventClassifications, ICAO_CATEGORIES, isEmailLike(), reportStatuses, resolveReporterLabel(), TriageForm(), TriageFormValues, triageSchema (+2 more)

### Community 100 - "Community 100"
Cohesion: 0.64
Nodes (7): DELETE(), GET(), getTenantId(), normalizeRoute(), PATCH(), POST(), ensureTrainingRoutesSchema()

### Community 101 - "Community 101"
Cohesion: 0.10
Nodes (18): NewMocForm(), NewMocFormValues, getMocPrefix(), NewMocContent(), toNoonUtcIso(), NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage() (+10 more)

### Community 102 - "chart.tsx"
Cohesion: 0.20
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "Community 104"
Cohesion: 0.20
Nodes (10): MocActionsProps, ApprovalFormProps, CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask (+2 more)

### Community 105 - "page.tsx"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TRAINING_COMPETENCY_OPTIONS, TrainingCompetencyArea, TrainingCompetencyDefinition (+2 more)

### Community 106 - "page.tsx"
Cohesion: 0.15
Nodes (6): DepartmentPageProps, PersonnelDirectoryPage(), PersonnelDirectoryPageProps, StudentProgressionReviewRecord, UserAccessOverrides, RoleUsersPageProps

### Community 107 - "Community 107"
Cohesion: 0.22
Nodes (7): FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, ActiveLegState

### Community 108 - "Community 108"
Cohesion: 0.08
Nodes (51): GET(), getTenantId(), PATCH(), POST(), DELETE(), GET(), getTenantIdForSession(), PATCH() (+43 more)

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 113 - "page.tsx"
Cohesion: 0.25
Nodes (7): prompt, summarizeMaintenanceLogs(), summarizeMaintenanceLogsFlow, SummarizeMaintenanceLogsInput, SummarizeMaintenanceLogsInputSchema, SummarizeMaintenanceLogsOutput, SummarizeMaintenanceLogsOutputSchema

### Community 114 - "Community 114"
Cohesion: 0.42
Nodes (8): GET(), getTenantId(), PUT(), readConfig(), signatureChanged(), validateDebriefSignatureMutation(), writeConfig(), StudentProgressReport

### Community 117 - "Community 117"
Cohesion: 0.08
Nodes (65): formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema, FormValues (+57 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.25
Nodes (8): getTenantPageLayoutSettings(), buildDefaultPageLayoutSettings(), PageLayoutDefinition, PageLayoutSettings, PageLayoutState, PageSectionDefinition, PageTabDefinition, SAFETY_QUALITY_LAYOUT_DEFINITIONS

### Community 126 - "page.tsx"
Cohesion: 0.29
Nodes (8): getCapSourceDetails(), getQualityMetrics(), getSafetyMetrics(), normalizeCancellationReason(), OperationalListView(), parseLocalDate(), QualityOverviewCard(), SafetyOverviewCard()

### Community 127 - "react-leaflet"
Cohesion: 0.15
Nodes (23): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+15 more)

### Community 128 - "SidebarItems"
Cohesion: 0.29
Nodes (8): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), renderNestedSubItems(), setLastSubmenuByParent(), SidebarItems()

### Community 129 - "route.ts"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 130 - "formatHours"
Cohesion: 0.67
Nodes (4): formatHours(), getStatusStyles(), InstructorLoadCard(), InstructorOverviewCard()

### Community 131 - "table-template.ts"
Cohesion: 0.50
Nodes (3): Cell, TableData, TableTemplate

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "Community 234"
Cohesion: 0.06
Nodes (44): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+36 more)

### Community 242 - "Community 242"
Cohesion: 0.27
Nodes (9): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+1 more)

### Community 244 - "Community 244"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "Community 251"
Cohesion: 0.06
Nodes (35): createDb(), getDb(), activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans (+27 more)

### Community 289 - "Community 289"
Cohesion: 0.09
Nodes (50): asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH(), restoreArchive(), assertActionPermission() (+42 more)

### Community 332 - "Community 332"
Cohesion: 0.12
Nodes (18): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, WarningPeriod, ExamFormProps, ExamOption, ExamPublication (+10 more)

### Community 333 - "Community 333"
Cohesion: 0.17
Nodes (17): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+9 more)

### Community 340 - "Community 340"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "Community 349"
Cohesion: 0.11
Nodes (23): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, DropdownMenuCheckboxItem (+15 more)

### Community 353 - "Community 353"
Cohesion: 0.09
Nodes (37): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, BookingStatus, PostFlightData (+29 more)

## Knowledge Gaps
- **1046 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1041 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 88` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 46`, `Community 47`, `Community 48`, `Community 52`, `Community 53`, `Community 56`, `Community 57`, `Community 58`, `Community 63`, `Community 64`, `Community 72`, `Community 332`, `Community 78`, `Community 81`, `ensureExternalOrganizationsSchema`, `exam-form.tsx`, `Community 87`, `Community 89`, `Community 93`, `Community 349`, `Community 96`, `Community 353`, `Community 99`, `Community 101`, `Community 242`, `Community 117`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 19`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 169`, `Community 170`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `@azure/storage-blob`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `Community 19` to `Community 96`, `Community 35`, `Community 67`, `Community 11`, `Community 80`, `Community 23`, `Community 88`, `Community 31`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1046 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12222222222222222 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04810744810744811 - nodes in this community are weakly interconnected._