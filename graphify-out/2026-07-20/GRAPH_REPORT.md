# Graph Report - Safeviate-Manager-Vercel  (2026-07-20)

## Corpus Check
- 623 files · ~488,111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4036 nodes · 15207 edges · 214 communities (161 shown, 53 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5fca040`
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
- page.tsx
- Community 80
- Community 81
- aircraft-edit-actions.tsx
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
- scroll-area.tsx
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
- Community 110
- Community 111
- Community 112
- calendar.tsx
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- react-leaflet
- layout.tsx
- route.ts
- route.ts
- quick-reports.ts
- mass-balance-envelope-chart.tsx
- page.tsx
- Community 134
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
- Community 235
- Community 236
- Community 237
- Community 242
- Community 244
- Community 251
- Community 261
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
2. `cn()` - 297 edges
3. `Button` - 226 edges
4. `useUserProfile()` - 192 edges
5. `Card` - 185 edges
6. `CardContent` - 171 edges
7. `usePermissions()` - 162 edges
8. `useIsMobile()` - 127 edges
9. `Badge()` - 126 edges
10. `Input` - 125 edges

## Surprising Connections (you probably didn't know these)
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `RiskMatrixPage()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-matrix/page.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `RiskForm()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json

## Import Cycles
- 1-file cycle: `src/lib/placeholder-images.ts -> src/lib/placeholder-images.ts`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`

## Communities (214 total, 53 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (25): allocateNextAuditNumber(), archiveAuditSignoffAlert(), AuditSequenceTx, buildAuditeeSignoffAlert(), DELETE(), existingAuditNumber(), formatAuditSequenceNumber(), GET() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (59): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.23
Nodes (13): ComplianceItemForm(), ComplianceItemFormValues, formatParentOptionLabel(), headerFormSchema, itemFormSchema, normalizeLineIndentation(), normalizeRegulationCode(), normalizeResponsibleManagerId() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (7): FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, ActiveLegState

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (17): ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), INSPECTION_TYPE_OPTIONS (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (13): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (51): BillingTable(), parseLocalDate(), buildComplianceItemIdentityKey(), CoherenceMatrixPage(), dedupeComplianceItems(), formatAuditDate(), formatParentOptionLabel(), getBrowserRegulationTitle() (+43 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (13): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (31): buildDefaultEnabledHrefs(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), INDUSTRY_TYPES, isTenantMenuHref() (+23 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (66): formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, FormValues, NewAircraftForm(), formSchema (+58 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (34): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+26 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (26): AddMaintenanceLogDialog(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, COMPONENT_ATA_OPTIONS, componentSchema, ComponentsTab(), ComponentValues (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (60): DepartmentPage(), AdminPage(), PageFormatPage(), RolesPage(), AssetsPage(), BookingsPage(), defectsPage(), MaintenanceSchedulePage() (+52 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (33): BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments(), getDatesInRangeInclusive(), isDateWithinWindow() (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (87): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+79 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (26): DepartmentActionsProps, DEFAULT_TOPICS, ExamTopicsSettings, RoleActionsProps, AircraftActionsProps, parseLocalDate(), VehicleList(), BookingBuckets (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (40): Department, Role, BookingDetailPageProps, LogbookTemplate, ChecklistTemplateCard(), ChecklistTemplateCardProps, ImportFromMatrixDialog(), NewChecklistDialog() (+32 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (20): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialogProps, ComplianceItemFormProps, AiGapAnalysisGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialogProps (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (14): CATEGORIES, ContactsTabProps, DiaryTabProps, MediaTabProps, STANDARD_TEMPLATES, TYPE_ORDER, ERPCollectedDocument, ERPContact (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (24): DocumentDatesPage(), FeaturesPage(), createInitialTable(), TableBuilderPage(), BookingPlanningMap(), BookingPlanningMapProps, BookingPlanningMapSettings, buildWaypointContext() (+16 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (30): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (24): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (14): ExternalUsersTable(), ExternalUsersTableProps, UserProfile, InstructorsTable(), InstructorsTableProps, PersonnelActions(), PersonnelTable(), PersonnelTableProps (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.03
Nodes (91): BillingTableProps, BillingTableProps, AircraftActionsProps, AircraftFormProps, EditHoursDialogProps, AeronauticalMap, BookingPerson, BookingStation (+83 more)

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
Cohesion: 0.09
Nodes (38): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+30 more)

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (57): StartAuditDialogProps, AuditChecklistProps, CapActionsFormProps, GapAnalysisChecklistProps, GapAnalysisDetailPage(), GapAnalysisDetailPageProps, parseLocalDate(), CapTaskDetailCard (+49 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (18): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (9): AddAircraftDialog(), AircraftFleetPage(), COMPLETED_AUDIT_STATUSES, getLastAuditDates(), AddVehicleDialog(), VehiclesPage(), CardControlHeader(), Vehicle (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps, ReportsTableProps, CorrectiveActionsFormProps, FinalReviewProps (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (16): buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor(), mapDatesToObjects(), mitigationSchema, parseLocalDate() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (50): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+42 more)

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (17): ACTIVE_INVITE_SELECT, buildPasswordSetupLink(), completePasswordSetup(), derivePasswordSetupToken(), findActivePasswordSetupInvite(), getPasswordSetupStatusByEmail(), getPasswordSetupTokenSecret(), hashToken() (+9 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (45): BillingTable(), parseLocalDate(), DocumentExpirySettings, AircraftTableProps, AircraftDocuments(), AircraftDocumentsProps, parseLocalDate(), ComponentForm() (+37 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (37): ActiveFlightPage(), clearActiveTrackingState(), clearQueuedFlightSession(), clearQueuedTrackPoints(), getActiveTrackingSelectionKey(), getActiveTrackingStateKey(), getFlightSessionOutboxKey(), getFlightTrackPointOutboxKey() (+29 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (36): FindingLevel, AuditChecklist(), defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema, formatAuditDate(), formSchema (+28 more)

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (34): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+26 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (21): defaultFindingLevels, FeatureSettings, FindingLevelsSettings, calculateSpans(), HeaderCell, TablePreview(), AuditDetailPage(), AuditDetailPageProps (+13 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 45 - "Community 45"
Cohesion: 0.16
Nodes (14): canManageTenantSettings(), Document, isPilotProfile(), parseLocalDate(), roleGrantsPermission(), UserProfile, ViewPersonnelDetails(), CanonicalPermission (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (21): PermissionsPage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, EditPersonnelForm(), isPilotProfile() (+13 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (12): TaskCardAttachment, TaskCardItem(), TaskCardItemProps, TaskCardSignature, WorkpackList(), SecureSignaturePad(), MediaAttachment, TaskCard (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (6): DepartmentPageProps, PersonnelDirectoryPage(), PersonnelDirectoryPageProps, StudentProgressionReviewRecord, UserAccessOverrides, RoleUsersPageProps

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (38): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+30 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (39): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+31 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (21): AuditActions(), AuditActionsProps, AuditsTable(), AuditsTableProps, EnrichedAudit, getStatusBadgeVariant(), parseLocalDate(), DepartmentOption (+13 more)

### Community 53 - "Community 53"
Cohesion: 0.14
Nodes (24): AdminTrainingExercisesPage(), cloneTemplates(), buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues (+16 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (37): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), lastSubmenuByParentMemory, renderNestedSubItems(), setLastSubmenuByParent() (+29 more)

### Community 55 - "Community 55"
Cohesion: 0.07
Nodes (38): clamp(), formatLitres(), FuelStation, FuelStationInput, MassBalanceConfigPage(), normalizeFuelStation(), POINT_COLORS, serializeStation() (+30 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (16): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), likelihoodLabels, mitigationReviewSchema, normalizeRiskAssessment(), parseLocalDate() (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (11): FlightPlannerPage(), ColorThemeForm(), ColorThemeFormProps, mergeTenantConfig(), PALETTE_PRESETS, PalettePreset, readLocalTenantOverride(), SidebarBrandLogoFooter() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (8): LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookOutput, ParseLogbookOutputSchema, prompt

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
Cohesion: 0.21
Nodes (16): POST(), POST(), POST(), POST(), POST(), saveOrganizationThemeAction(), hasHierarchicalPermission(), authenticateAiRequest() (+8 more)

### Community 63 - "Community 63"
Cohesion: 0.21
Nodes (12): POST(), POST(), POST(), ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES, enforceRateLimit(), getRequestClientIp(), HeaderCapableRequest (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.10
Nodes (22): VehicleDetailPageProps, vehicleSchema, checklistItemSchema, DepartmentOption, formSchema, FormValues, sectionSchema, TemplateEditorActionArgs (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (38): POST(), readHeader(), GET(), GET(), DELETE(), GET(), getTenantIdForSession(), PATCH() (+30 more)

### Community 67 - "Community 67"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (8): RegisteredFlowName, POST(), RouteContext, aiFlowPermissions, DbUserProfile, FlowPermissionRule, isAuthorizedForAiFlow(), SUPER_USERS

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (32): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), buildTenantDefaultRoles() (+24 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (43): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+35 more)

### Community 72 - "Community 72"
Cohesion: 0.21
Nodes (9): AddToolDialog(), ToolsPage(), ToolList(), AddToolDialog(), ToolsPage(), ToolList(), Tool, ToolOwnerType (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.14
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.19
Nodes (10): buildRiskAssessmentPath(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationFormProps, hazardIdentificationSchema, reportHazardSchema, reportRiskSchema (+2 more)

### Community 79 - "page.tsx"
Cohesion: 0.18
Nodes (11): AreaActionsProps, AuditSchedulePage(), getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelector() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.16
Nodes (15): AppLayout(), parseLocalDate(), ReportForumProps, TimelineEntry, AppHeader(), findCurrentItem(), getTitle(), AppSidebar() (+7 more)

### Community 81 - "Community 81"
Cohesion: 0.08
Nodes (30): NewRolePage(), EditRolePage(), AircraftQrPageProps, AircraftTableProps, ViewAircraftDetailsProps, ChecklistTemplateCard(), ChecklistTemplateCardProps, ASSET_CATEGORY_LABELS (+22 more)

### Community 82 - "aircraft-edit-actions.tsx"
Cohesion: 0.24
Nodes (9): cleanData(), componentSchema, ComponentsFormValues, componentsSchema, DetailsFormValues, detailsSchema, EditComponentsDialog(), EditDetailsDialog() (+1 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.22
Nodes (10): AiExamGeneratorProps, ExamFormProps, examFormSchema, optionSchema, questionSchema, ExamState, TakeExamDialogProps, RadioGroup (+2 more)

### Community 84 - "Community 84"
Cohesion: 0.08
Nodes (29): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), formatDate(), formatEntityType(), RecoveryArchive (+21 more)

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (10): FlowDefinition, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema, prompt (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.04
Nodes (64): DataPortabilityPage(), DatabaseForm(), DepartmentActions(), DepartmentForm(), ExamTopicsPage(), OverdueSettingsPage(), TenantDirectory(), VisibilityManager() (+56 more)

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (12): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+4 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "manage-cap-dialog.tsx"
Cohesion: 0.18
Nodes (15): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), DocumentsTab(), parseLocalDate(), VehicleDocumentsTab() (+7 more)

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
Cohesion: 0.06
Nodes (67): AccountingPage(), AccountingPage(), ExternalOrganizationsPage(), ExternalCompaniesPage(), AddComponentDialog(), toNoonUtcIso(), WBCalculatorContent(), VehicleDetailPage() (+59 more)

### Community 97 - "scroll-area.tsx"
Cohesion: 0.23
Nodes (12): AddComponentDialog(), AddDefectDialog(), AircraftDetailPage(), categorizeDefect(), DEFECT_CATEGORIES, EditDefectDialog(), formatHoursValue(), MaintenanceTab() (+4 more)

### Community 98 - "alert.ts"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (8): buildDecimalFromParts(), createInitialDmsState(), Hemisphere, WaypointDmsDialog(), WaypointDmsDialogProps, WaypointDmsForm(), WaypointDmsFormProps, WaypointDmsFormState

### Community 100 - "Community 100"
Cohesion: 0.23
Nodes (11): buildServerThemeStyle(), buildThemeBootstrapScript(), getInitialTenantBootstrap(), hexToHslString(), inter, metadata, RootLayout(), TenantBootstrapConfig (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.25
Nodes (7): getTenantOverride(), UserProfileProvider(), CacheEntry, getOrSetClientApiCache(), inflightCache, invalidateClientApiCache(), valueCache

### Community 102 - "chart.tsx"
Cohesion: 0.12
Nodes (13): react, react, RisksArray(), TaskCard(), ChartConfig, ChartContainer, ChartContext, ChartContextProps (+5 more)

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "Community 104"
Cohesion: 0.17
Nodes (12): CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData, OpenMeteoData, WeatherCloudLayer, WeatherMetarData (+4 more)

### Community 105 - "page.tsx"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+2 more)

### Community 106 - "page.tsx"
Cohesion: 0.07
Nodes (30): defaultSettings, OverdueMonitorSettings, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, ActiveFlightLiveMap (+22 more)

### Community 107 - "Community 107"
Cohesion: 0.64
Nodes (7): DELETE(), GET(), getTenantId(), normalizeRoute(), PATCH(), POST(), ensureTrainingRoutesSchema()

### Community 108 - "Community 108"
Cohesion: 0.07
Nodes (66): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+58 more)

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "Community 110"
Cohesion: 0.22
Nodes (4): Mitigation, PhaseItem, RiskItem, StepItem

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 113 - "calendar.tsx"
Cohesion: 0.29
Nodes (7): prompt, summarizeMaintenanceLogs(), summarizeMaintenanceLogsFlow, SummarizeMaintenanceLogsInput, SummarizeMaintenanceLogsInputSchema, SummarizeMaintenanceLogsOutput, SummarizeMaintenanceLogsOutputSchema

### Community 114 - "Community 114"
Cohesion: 0.15
Nodes (7): accentStyles, assurance, coreCards, intelligence, LoginClient(), sectorVisuals, workspaces

### Community 117 - "Community 117"
Cohesion: 0.07
Nodes (65): DepartmentFormProps, AircraftForm(), formSchema, ComponentFormProps, componentSchema, FormValues, AddComponentDialog(), formSchema (+57 more)

### Community 118 - "Community 118"
Cohesion: 0.42
Nodes (8): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureExternalOrganizationsSchema()

### Community 127 - "react-leaflet"
Cohesion: 0.57
Nodes (7): DELETE(), GET(), getTenantId(), POST(), PUT(), toStableJson(), ensureManagementOfChangeSchema()

### Community 128 - "layout.tsx"
Cohesion: 0.38
Nodes (6): ExerciseReviewPage(), ExerciseReviewPageProps, formatLongDate(), getInstructorRecommendationMeta(), ReviewEntry, SummaryPayload

### Community 129 - "route.ts"
Cohesion: 0.52
Nodes (6): GET(), getTenantId(), PATCH(), PUT(), toStableJson(), validateLifecycleUpdate()

### Community 130 - "route.ts"
Cohesion: 0.73
Nodes (5): GET(), getTenantId(), PATCH(), POST(), ensureAlertsSchema()

### Community 131 - "quick-reports.ts"
Cohesion: 0.40
Nodes (4): QuickSafetyInboxProps, QuickReportWorkflowStatus, QuickSafetyReport, TechnicalQuickReport

### Community 132 - "mass-balance-envelope-chart.tsx"
Cohesion: 0.83
Nodes (3): AssetInspectionsPage(), formatInspectionDate(), getStatusBadgeClass()

### Community 133 - "page.tsx"
Cohesion: 0.67
Nodes (3): buttonVariants, Calendar(), CalendarProps

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "Community 234"
Cohesion: 0.07
Nodes (39): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+31 more)

### Community 235 - "Community 235"
Cohesion: 0.31
Nodes (6): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES

### Community 236 - "Community 236"
Cohesion: 0.19
Nodes (14): formatLatLonDms(), axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), formatWaypointCoordinatesDms(), normalizeSeconds() (+6 more)

### Community 237 - "Community 237"
Cohesion: 0.31
Nodes (9): classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines(), splitDetailText(), WaypointDetailEntry, WaypointDetailGroup, WaypointDetailSource (+1 more)

### Community 242 - "Community 242"
Cohesion: 0.27
Nodes (9): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+1 more)

### Community 244 - "Community 244"
Cohesion: 0.08
Nodes (31): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+23 more)

### Community 251 - "Community 251"
Cohesion: 0.06
Nodes (35): createDb(), getDb(), activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans (+27 more)

### Community 261 - "Community 261"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 289 - "Community 289"
Cohesion: 0.08
Nodes (54): GET(), isBarryMasterUser(), asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH() (+46 more)

### Community 332 - "Community 332"
Cohesion: 0.13
Nodes (17): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, WarningPeriod, ExamOption, ExamQuestion, ExamResult (+9 more)

### Community 333 - "Community 333"
Cohesion: 0.16
Nodes (18): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+10 more)

### Community 340 - "Community 340"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "Community 349"
Cohesion: 0.10
Nodes (25): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, DropdownMenuCheckboxItem, SheetContent, SheetContentProps (+17 more)

### Community 353 - "Community 353"
Cohesion: 0.10
Nodes (31): BookingStatus, MocHazard, MocMitigation, MocMitigationStatus, MocPhase, MocRisk, MocSignature, MocStatus (+23 more)

## Knowledge Gaps
- **1045 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1040 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 88` to `Community 2`, `Community 4`, `mass-balance-envelope-chart.tsx`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 64`, `Community 72`, `Community 332`, `Community 78`, `Community 80`, `Community 81`, `aircraft-edit-actions.tsx`, `exam-form.tsx`, `Community 84`, `Community 87`, `Community 89`, `manage-cap-dialog.tsx`, `Community 93`, `Community 349`, `Community 96`, `scroll-area.tsx`, `Community 99`, `chart.tsx`, `Community 104`, `page.tsx`, `Community 114`, `Community 242`, `Community 117`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 134`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 169`, `Community 170`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `chart.tsx`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `chart.tsx` to `Community 96`, `Community 35`, `Community 67`, `Community 75`, `Community 11`, `Community 78`, `Community 54`, `Community 23`, `Community 88`, `Community 31`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1045 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1380952380952381 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.0662004662004662 - nodes in this community are weakly interconnected._