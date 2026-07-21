# Graph Report - Safeviate-Manager-Vercel  (2026-07-21)

## Corpus Check
- 623 files · ~488,705 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4037 nodes · 15203 edges · 200 communities (146 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d013bbdb`
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
- color-theme-form.tsx
- Community 78
- Community 80
- Community 81
- ensureExternalOrganizationsSchema
- exam-form.tsx
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
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
- react-leaflet
- SidebarItems
- route.ts
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
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (200 total, 54 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (33): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), allocateNextAuditNumber() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (60): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+52 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (51): Department, Role, DebriefRoomBookingFormProps, NewBookingPage(), LogbookTemplate, ChecklistTemplateCard(), ChecklistTemplateCardProps, NewChecklistDialogProps (+43 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (26): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, ASSET_TYPE_OPTIONS, AssetInspectionNewPage() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (13): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (21): printOptions, PrintTarget, QrCodePrintMenu(), MocActions(), MocActionsProps, ApprovalForm(), ApprovalFormProps, ImplementationForm (+13 more)

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
Cohesion: 0.06
Nodes (85): AddComponentDialog(), AddComponentDialogProps, componentFormSchema, ComponentFormValues, toNoonUtcIso(), formSchema, FormValues, DebriefRoomBookingDraft (+77 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (39): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+31 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (46): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+38 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (76): ExternalCompaniesPage(), AdminPage(), PageFormatPage(), VisibilityManager(), PermissionsPage(), AssetChecklistsPage(), AssetsPage(), BookingsPage() (+68 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (38): BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft, BookingForm(), bookingFormSchema, combineLocalDateAndTime(), getBookingRange(), parseLocalDate() (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (84): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+76 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (21): DepartmentActionsProps, RoleActionsProps, parseLocalDate(), VehicleList(), BookingBuckets, EnrichedBooking, UpsertQuestionDialogProps, PersonnelActionsProps (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (30): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialog(), ImportFromGapAnalysesDialogProps, parseLocalDate(), ImportFromMatrixDialog(), ImportFromMatrixDialogProps, MatrixTreeNode (+22 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (12): buildRiskAssessmentPath(), deriveCorrectiveActionsFromHazards(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationForm(), HazardIdentificationFormProps, hazardIdentificationSchema (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (44): BillingTable(), BillingTableProps, parseLocalDate(), DEFAULT_TOPICS, ExamTopicsPage(), ExamTopicsSettings, AircraftActions(), AssetInspectionsPage() (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (26): DocumentDatesPage(), FeaturesPage(), BookingPlannedLegsPanelProps, BookingPlanningMap(), BookingPlanningMapProps, BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (30): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (22): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationFormProps, mapDatesToObjects(), MatrixRowHeader() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (36): POST(), POST(), DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory() (+28 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (21): BillingTableProps, AircraftActionsProps, AircraftActionsProps, AircraftFormProps, AircraftTableProps, AircraftDocumentsProps, EditHoursDialogProps, ViewAircraftDetailsProps (+13 more)

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
Cohesion: 0.05
Nodes (49): AreaActionsProps, AuditSchedulePage(), getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelectorProps (+41 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (19): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (22): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), AircraftDocuments(), parseLocalDate(), parseLocalDate() (+14 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (16): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (16): buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor(), mapDatesToObjects(), mitigationSchema, parseLocalDate() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (62): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+54 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (36): FindingLevel, AlertCard(), AuditChecklist(), AuditChecklistProps, defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema (+28 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (39): BillingTable(), parseLocalDate(), DocumentExpirySettings, ComponentForm(), ComponentFormProps, ComponentList(), ComponentListProps, parseLocalDate() (+31 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (19): getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle(), getBearing(), getDistance() (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (19): NavlogBuilder(), AeronauticalMap, FlightPlannerPage(), createEmptyRoute(), TrainingRoutesPage(), formatLatLonDms(), axisHemisphere, axisLimits (+11 more)

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (36): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+28 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (26): FindingLevelsSettings, AuditDetailPage(), AuditDetailPageProps, parseLocalDate(), GapAnalysisDetailPage(), GapAnalysisDetailPageProps, parseLocalDate(), defaultColors (+18 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (14): getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, getPermissionDisplayLabel(), PermissionDisplayLabel, getPermissionSections() (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (26): ComplianceItemForm(), ComplianceItemFormValues, formatParentOptionLabel(), headerFormSchema, itemFormSchema, normalizeLineIndentation(), normalizeRegulationCode(), normalizeResponsibleManagerId() (+18 more)

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (12): WorkpackDetailsPage(), TaskCardDialog(), TaskCardAttachment, TaskCardItem(), TaskCardItemProps, TaskCardSignature, MediaAttachment, TaskCard (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (33): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+25 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (41): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+33 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (23): QuickSafetyReportPage(), parseLocalDate(), TechnicalReportDetailPage(), EditReportDialog(), parseLocalDate(), ArchiveReportButton(), DepartmentOption, getSafetyReportGroup() (+15 more)

### Community 53 - "Community 53"
Cohesion: 0.21
Nodes (12): AdminTrainingExercisesPage(), cloneTemplates(), ExerciseReviewPage(), formatLongDate(), getInstructorRecommendationMeta(), resolveTrainingExerciseTemplates(), sanitizeCriterion(), sanitizeTemplate() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (31): AppSidebarMobile(), lastSubmenuByParentMemory, SidebarBrandLogoFooter(), USERS_STATIC_SUB_ITEMS, Sidebar, SidebarCollapsibleContent, SidebarCollapsibleTrigger, SidebarContent (+23 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (14): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.03
Nodes (81): DataPortabilityPage(), DatabaseForm(), defaultSettings, OverdueMonitorSettings, OverdueSettingsPage(), TenantDirectory(), AddAircraftDialog(), AircraftTable() (+73 more)

### Community 57 - "Community 57"
Cohesion: 0.05
Nodes (56): WBCalculatorContent(), BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS (+48 more)

### Community 58 - "Community 58"
Cohesion: 0.27
Nodes (12): BookingPlannedLegsPanel(), classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines(), getWaypointDetailTone(), getWaypointDetailToneClass(), splitDetailText() (+4 more)

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
Cohesion: 0.06
Nodes (60): POST(), POST(), POST(), POST(), POST(), POST(), GET(), getMeetingRows() (+52 more)

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (24): parseLocalDate(), VehicleDetailPage(), VehicleDocumentsTab(), BookingsTable(), NewBookingForm(), DashboardListRow(), StageCard(), StatTile() (+16 more)

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
Cohesion: 0.12
Nodes (32): DELETE(), GET(), getConfig(), getTenantId(), loadAircraft(), loadAudits(), loadCaps(), loadExternalOrganizations() (+24 more)

### Community 72 - "Community 72"
Cohesion: 0.21
Nodes (16): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues, HAZARDOUS_ATTITUDE_OPTIONS, HUMAN_FACTORS_CHECKS (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (7): ColorThemeForm(), ColorThemeFormProps, mergeTenantConfig(), PALETTE_PRESETS, PalettePreset, readLocalTenantOverride(), getTenantThemeLocalOverrideKey()

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 77 - "color-theme-form.tsx"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 78 - "Community 78"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 80 - "Community 80"
Cohesion: 0.19
Nodes (12): AppLayout(), AppHeader(), findCurrentItem(), getTitle(), AppSidebar(), Avatar, AvatarFallback, AvatarImage (+4 more)

### Community 81 - "Community 81"
Cohesion: 0.05
Nodes (47): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), defaultFindingLevels, FeatureSettings, formatDate() (+39 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.22
Nodes (14): clamp(), formatLitres(), FuelStation, FuelStationInput, MassBalanceConfigPage(), normalizeFuelStation(), POINT_COLORS, serializeStation() (+6 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.14
Nodes (15): AiExamGeneratorProps, ExamForm(), examFormSchema, ExamFormValues, optionSchema, questionSchema, NewExamPage(), ExamState (+7 more)

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
Cohesion: 0.21
Nodes (10): cleanData(), componentSchema, ComponentsFormValues, componentsSchema, DetailsFormValues, detailsSchema, EditComponentsDialog(), EditDetailsDialog() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.13
Nodes (19): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+11 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

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
Cohesion: 0.05
Nodes (73): AccountingPage(), AccountingPage(), DepartmentActions(), DepartmentForm(), DepartmentPage(), ExternalOrganizationsPage(), NewRolePage(), RolesPage() (+65 more)

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
Cohesion: 0.14
Nodes (13): NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage(), parseLocalDate(), PilotLogbook(), Document, isPilotProfile(), parseLocalDate() (+5 more)

### Community 102 - "chart.tsx"
Cohesion: 0.12
Nodes (14): react, react, RisksArray(), TaskCard(), useCarousel(), ChartConfig, ChartContainer, ChartContext (+6 more)

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (7): CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask, UpcomingScheduledAudit

### Community 105 - "page.tsx"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TRAINING_COMPETENCY_OPTIONS, TrainingCompetencyArea, TrainingCompetencyDefinition (+2 more)

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
Cohesion: 0.06
Nodes (74): DepartmentFormProps, formSchema, AircraftForm(), formSchema, ComponentFormProps, componentSchema, FormValues, AddComponentDialog() (+66 more)

### Community 118 - "tenant-setup-presets.ts"
Cohesion: 0.25
Nodes (8): getTenantPageLayoutSettings(), buildDefaultPageLayoutSettings(), PageLayoutDefinition, PageLayoutSettings, PageLayoutState, PageSectionDefinition, PageTabDefinition, SAFETY_QUALITY_LAYOUT_DEFINITIONS

### Community 127 - "react-leaflet"
Cohesion: 0.15
Nodes (23): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+15 more)

### Community 128 - "SidebarItems"
Cohesion: 0.29
Nodes (8): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), renderNestedSubItems(), setLastSubmenuByParent(), SidebarItems()

### Community 129 - "route.ts"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "Community 234"
Cohesion: 0.07
Nodes (39): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+31 more)

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
Cohesion: 0.12
Nodes (22): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, SheetContent (+14 more)

### Community 353 - "Community 353"
Cohesion: 0.12
Nodes (25): BookingStatus, PostFlightData, MocHazard, MocMitigation, MocMitigationStatus, MocPhase, MocRisk, MocSignature (+17 more)

## Knowledge Gaps
- **1046 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1041 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 56` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 52`, `Community 53`, `Community 57`, `Community 63`, `Community 64`, `Community 72`, `Community 73`, `Community 332`, `Community 81`, `ensureExternalOrganizationsSchema`, `exam-form.tsx`, `Community 87`, `Community 88`, `Community 89`, `Community 93`, `Community 349`, `Community 96`, `Community 99`, `Community 101`, `chart.tsx`, `Community 242`, `Community 117`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 169`, `Community 170`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `chart.tsx`, `@azure/storage-blob`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `chart.tsx` to `Community 96`, `Community 67`, `Community 35`, `Community 43`, `Community 11`, `Community 19`, `Community 54`, `Community 23`, `Community 56`, `Community 31`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1046 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12222222222222222 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0496031746031746 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07757221681272314 - nodes in this community are weakly interconnected._