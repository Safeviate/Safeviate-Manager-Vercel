# Graph Report - Safeviate-Manager-Vercel  (2026-07-20)

## Corpus Check
- 623 files · ~487,862 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4036 nodes · 15205 edges · 212 communities (159 shown, 53 thin omitted)
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
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `RiskMatrixPage()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-matrix/page.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `FinalReview()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json

## Import Cycles
- 1-file cycle: `src/lib/placeholder-images.ts -> src/lib/placeholder-images.ts`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (212 total, 53 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (48): allocateNextAuditNumber(), archiveAuditSignoffAlert(), AuditSequenceTx, buildAuditeeSignoffAlert(), DELETE(), existingAuditNumber(), formatAuditSequenceNumber(), GET() (+40 more)

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
Cohesion: 0.13
Nodes (18): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.26
Nodes (15): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (29): printOptions, PrintTarget, QrCodePrintMenu(), MocActions(), MocActionsProps, ApprovalForm(), ApprovalFormProps, MocDetailPage() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (46): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+38 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (10): CompetencyRow(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1(), TrainingRecords() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (41): DEFAULT_TOPICS, ExamTopicsSettings, formatDate(), formatEntityType(), RecoveryArchive, RecoveryVaultPage(), buildDefaultEnabledHrefs(), buildTenantIdFromName() (+33 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (86): formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, componentSchema, ComponentsFormValues, componentsSchema, DetailsFormValues (+78 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (34): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+26 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (28): AddMaintenanceLogDialog(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, COMPONENT_ATA_OPTIONS, componentSchema, ComponentsTab(), ComponentValues (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (68): DepartmentPage(), ExternalCompaniesPage(), AdminPage(), PageFormatPage(), RolesPage(), RoleActions(), ASSET_CATEGORY_LABELS, AssetsPage() (+60 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (47): BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft, BookingForm(), bookingFormSchema, combineLocalDateAndTime(), getBookingRange(), parseLocalDate() (+39 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (89): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+81 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (46): AircraftActionsProps, parseLocalDate(), VehicleList(), BookingBuckets, BookingsHistoryPage(), BookingsTable(), DeleteBookingButton(), EnrichedBooking (+38 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (28): DepartmentActionsProps, Department, FindingLevel, AuditChecklistsManager(), ChecklistTemplateCard(), ChecklistTemplateCardProps, NewChecklistDialog(), NewChecklistDialogProps (+20 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (23): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), ImportFromMatrixDialogProps, ComplianceItemFormProps, AiGapAnalysisGenerator(), AiGapAnalysisGeneratorProps (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (35): BillingTableProps, BillingTableProps, AircraftActionsProps, AircraftForm(), AircraftFormProps, formSchema, Document, ManageComponentsDialog() (+27 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (19): BookingPlanningMap(), BookingPlanningMapProps, BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways(), formatFrequencyLabel() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (21): ACTION_STATUS_OPTIONS, createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (24): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (31): ExternalUsersTable(), ExternalUsersTableProps, UserProfile, InstructorsTable(), InstructorsTableProps, DepartmentPageProps, PersonnelActions(), PersonnelActionsProps (+23 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (61): BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey (+53 more)

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
Nodes (39): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+31 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (40): CapActionsFormProps, CapTaskDetailCard, CapTaskDetailCardHandle, CapTaskDetailCardProps, parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap(), CapTaskDetailPage() (+32 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (17): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (13): AddVehicleDialog(), VehiclesPage(), AuditActions(), AuditActionsProps, AuditsTable(), AuditsTableProps, EnrichedAudit, getStatusBadgeVariant() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (15): parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps, ReportsTableProps, CorrectiveActionsFormProps, FinalReviewProps (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.19
Nodes (10): eventClassifications, ICAO_CATEGORIES, isEmailLike(), reportStatuses, resolveReporterLabel(), TriageFormProps, TriageFormValues, triageSchema (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (50): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+42 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (18): POST(), ACTIVE_INVITE_SELECT, buildPasswordSetupLink(), completePasswordSetup(), derivePasswordSetupToken(), findActivePasswordSetupInvite(), getPasswordSetupStatusByEmail(), getPasswordSetupTokenSecret() (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (48): DocumentExpirySettings, AircraftTableProps, AircraftDocuments(), AircraftDocumentsProps, parseLocalDate(), ComponentForm(), ComponentList(), ComponentListProps (+40 more)

### Community 40 - "Community 40"
Cohesion: 0.09
Nodes (41): ActiveFlightPage(), clearActiveTrackingState(), clearQueuedFlightSession(), clearQueuedTrackPoints(), getActiveTrackingSelectionKey(), getActiveTrackingStateKey(), getFlightSessionOutboxKey(), getFlightTrackPointOutboxKey() (+33 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (27): CapActionsForm(), parseLocalDate(), toNoonUtcIso(), EnrichedCorrectiveActionPlan, ManageCapDialog(), ManageCapDialogProps, buildComplianceItemIdentityKey(), CoherenceMatrixPage() (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (34): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+26 more)

### Community 43 - "Community 43"
Cohesion: 0.19
Nodes (11): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, DocumentDatesPage(), WarningPeriod, defaultFindingLevels, FeatureSettings (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (18): POST(), POST(), canManageTenantSettings(), saveOrganizationThemeAction(), CanonicalPermission, CRUD_TIERS, expandLegacyManagePermissions(), hasHierarchicalPermission() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (16): AlertCard(), AuditCapEntry, AuditFindingEntry, buildFindingTaskId(), formatCapDueDate(), parseCapFindingLevel(), parseCapObservation(), parseLocalDate() (+8 more)

### Community 47 - "Community 47"
Cohesion: 0.14
Nodes (21): PermissionsPage(), getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleForm(), RoleFormProps, Document, isPilotProfile() (+13 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (11): WorkpackDetailsPage(), TaskCardItem(), TaskCardItemProps, WorkpacksPage(), WorkpackList(), MediaAttachment, TaskCard, TaskRole (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (14): Role, RoleActionsProps, LogbookTemplate, EditPersonnelForm(), EditPersonnelFormProps, isPilotProfile(), PersonnelFormState, UserProfile (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (46): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+38 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (43): formatLatLonDms(), airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm() (+35 more)

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (35): MyDashboardPage(), parseLocalDate(), AuditDetailPage(), parseLocalDate(), GapAnalysisDetailPage(), parseLocalDate(), QuickSafetyReportPage(), parseLocalDate() (+27 more)

### Community 53 - "Community 53"
Cohesion: 0.14
Nodes (24): AdminTrainingExercisesPage(), cloneTemplates(), buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues (+16 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (29): lastSubmenuByParentMemory, USERS_STATIC_SUB_ITEMS, Sidebar, SidebarCollapsibleContent, SidebarCollapsibleTrigger, SidebarContent, SidebarContext, SidebarFooter (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.07
Nodes (38): clamp(), formatLitres(), FuelStation, FuelStationInput, MassBalanceConfigPage(), normalizeFuelStation(), POINT_COLORS, serializeStation() (+30 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (15): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), likelihoodLabels, mitigationReviewSchema, normalizeRiskAssessment(), parseLocalDate() (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (9): LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutput, ParseLogbookOutputSchema (+1 more)

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
Nodes (15): POST(), POST(), POST(), POST(), POST(), MeetingEmailOptions, MeetingEmailResult, PasswordSetupEmailVariant (+7 more)

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (7): ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES, HeaderCapableRequest, matchesFileSignature(), RateLimitBucket, rateLimitBuckets, validateUploadFile()

### Community 64 - "Community 64"
Cohesion: 0.07
Nodes (31): ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, approvalFormSchema, ApprovalFormValues, signatureSchema (+23 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (13): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+5 more)

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
Cohesion: 0.18
Nodes (19): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), DELETE() (+11 more)

### Community 72 - "Community 72"
Cohesion: 0.26
Nodes (7): ToolsPage(), ToolList(), ToolsPage(), ToolList(), Tool, ToolOwnerType, ToolStatus

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 74 - "Community 74"
Cohesion: 0.19
Nodes (15): analyzeMoc(), AnalyzeMocInput, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema, phaseSchema (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.43
Nodes (5): SECTION_LABELS, Alert, AlertDescription, AlertTitle, alertVariants

### Community 79 - "page.tsx"
Cohesion: 0.18
Nodes (10): AreaActionsProps, getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelector(), StatusSelectorProps (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.36
Nodes (7): AppHeader(), findCurrentItem(), getTitle(), Avatar, AvatarFallback, AvatarImage, SidebarTrigger

### Community 81 - "Community 81"
Cohesion: 0.08
Nodes (35): FindingLevelsSettings, AircraftQrPageProps, AircraftTableProps, ViewAircraftDetailsProps, TaskCardAttachment, TaskCardSignature, AeronauticalMap, AuditDetailPageProps (+27 more)

### Community 83 - "exam-form.tsx"
Cohesion: 0.12
Nodes (15): VehicleDetailPageProps, vehicleSchema, ExamFormProps, examFormSchema, optionSchema, questionSchema, checklistItemSchema, DepartmentOption (+7 more)

### Community 84 - "Community 84"
Cohesion: 0.47
Nodes (5): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime()

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (10): FlowDefinition, AnalyzeMocInputSchema, generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.04
Nodes (80): AccountingPage(), AccountingPage(), DataPortabilityPage(), DatabaseForm(), DepartmentActions(), DepartmentForm(), ExamTopicsPage(), ExternalOrganizationsPage() (+72 more)

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (11): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "manage-cap-dialog.tsx"
Cohesion: 0.19
Nodes (14): AircraftActions(), AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), parseLocalDate(), VehicleDocumentsTab(), DocumentExpiryWarningPeriod (+6 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "Community 93"
Cohesion: 0.15
Nodes (10): SummarizeDocumentOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike, AiFlowFailure (+2 more)

### Community 94 - "page.tsx"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 95 - "generate-exam-flow.ts"
Cohesion: 0.22
Nodes (9): generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutput, GenerateExamOutputSchema, optionSchema, prompt (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.06
Nodes (45): BillingTable(), parseLocalDate(), BillingTable(), parseLocalDate(), WBCalculatorContent(), VehicleBookingItem(), DatabasePage(), LogbookParserPage() (+37 more)

### Community 97 - "scroll-area.tsx"
Cohesion: 0.21
Nodes (13): AddComponentDialog(), AddDefectDialog(), AircraftDetailPage(), categorizeDefect(), DEFECT_CATEGORIES, DocumentsTab(), EditDefectDialog(), formatHoursValue() (+5 more)

### Community 98 - "alert.ts"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (8): buildDecimalFromParts(), createInitialDmsState(), Hemisphere, WaypointDmsDialog(), WaypointDmsDialogProps, WaypointDmsForm(), WaypointDmsFormProps, WaypointDmsFormState

### Community 100 - "Community 100"
Cohesion: 0.10
Nodes (31): GET(), DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap() (+23 more)

### Community 101 - "Community 101"
Cohesion: 0.14
Nodes (15): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), renderNestedSubItems(), setLastSubmenuByParent(), SidebarItems() (+7 more)

### Community 102 - "chart.tsx"
Cohesion: 0.10
Nodes (19): react, react, defaultTrainingClassification(), mapDatesToObjects(), parseLocalDate(), RiskForm(), RisksArray(), RisksArray() (+11 more)

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "Community 104"
Cohesion: 0.17
Nodes (12): CheckWxData, CheckWxResponse, FlightCategoryData, formatTimestamp(), MetNorwayData, OpenMeteoData, WeatherCloudLayer, WeatherMetarData (+4 more)

### Community 105 - "page.tsx"
Cohesion: 0.36
Nodes (10): GET(), getMeetingRows(), getTenantContext(), loadPersonnelMap(), MeetingAction, PATCH(), POST(), toMeetingRecord() (+2 more)

### Community 106 - "page.tsx"
Cohesion: 0.27
Nodes (8): ActiveFlightLiveMap, ActiveTrackingSelection, ActiveTrackingState, clearLocationCalibration(), getLocationCalibrationKey(), LocationCalibration, readLocationCalibration(), saveLocationCalibration()

### Community 107 - "Community 107"
Cohesion: 0.10
Nodes (38): GET(), getTenantId(), PATCH(), POST(), DELETE(), GET(), getTenantIdForSession(), PATCH() (+30 more)

### Community 108 - "Community 108"
Cohesion: 0.11
Nodes (32): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+24 more)

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "Community 110"
Cohesion: 0.06
Nodes (29): AssetInspectionsPage(), formatInspectionDate(), getStatusBadgeClass(), calculateSpans(), HeaderCell, TablePreview(), Mitigation, PhaseItem (+21 more)

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 113 - "calendar.tsx"
Cohesion: 0.25
Nodes (7): prompt, summarizeMaintenanceLogs(), summarizeMaintenanceLogsFlow, SummarizeMaintenanceLogsInput, SummarizeMaintenanceLogsInputSchema, SummarizeMaintenanceLogsOutput, SummarizeMaintenanceLogsOutputSchema

### Community 114 - "Community 114"
Cohesion: 0.15
Nodes (7): accentStyles, assurance, coreCards, intelligence, LoginClient(), sectorVisuals, workspaces

### Community 117 - "Community 117"
Cohesion: 0.07
Nodes (67): DepartmentFormProps, defaultSettings, OverdueMonitorSettings, ComponentFormProps, componentSchema, FormValues, AddComponentDialog(), formSchema (+59 more)

### Community 118 - "Community 118"
Cohesion: 0.20
Nodes (9): defaultColors, defaultLikelihoods, defaultSeverities, deriveCorrectiveActionsFromHazards(), HazardIdentificationForm(), isEmailLike(), resolveReporterLabel(), SafetyReportDetailPageProps (+1 more)

### Community 127 - "react-leaflet"
Cohesion: 0.44
Nodes (7): DELETE(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureToolsSchema()

### Community 128 - "layout.tsx"
Cohesion: 0.29
Nodes (6): AppLayout(), AppSidebar(), AuthGuard(), AuthGuardProps, SidebarInset, SidebarProvider

### Community 129 - "route.ts"
Cohesion: 0.52
Nodes (6): GET(), getTenantId(), PATCH(), PUT(), toStableJson(), validateLifecycleUpdate()

### Community 130 - "route.ts"
Cohesion: 0.73
Nodes (5): DELETE(), GET(), getConfig(), getTenantId(), POST()

### Community 132 - "mass-balance-envelope-chart.tsx"
Cohesion: 0.60
Nodes (4): formatTick(), generateNiceTicks(), GraphPoint, MassBalanceEnvelopeChart()

### Community 133 - "page.tsx"
Cohesion: 0.83
Nodes (3): AircraftFleetPage(), COMPLETED_AUDIT_STATUSES, getLastAuditDates()

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "Community 234"
Cohesion: 0.07
Nodes (39): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+31 more)

### Community 235 - "Community 235"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 236 - "Community 236"
Cohesion: 0.27
Nodes (9): axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), normalizeSeconds(), normalizeText(), parseCoordinateDms() (+1 more)

### Community 237 - "Community 237"
Cohesion: 0.31
Nodes (9): classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines(), splitDetailText(), WaypointDetailEntry, WaypointDetailGroup, WaypointDetailSource (+1 more)

### Community 242 - "Community 242"
Cohesion: 0.27
Nodes (9): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+1 more)

### Community 244 - "Community 244"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

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
Cohesion: 0.12
Nodes (21): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+13 more)

### Community 333 - "Community 333"
Cohesion: 0.08
Nodes (34): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+26 more)

### Community 340 - "Community 340"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "Community 349"
Cohesion: 0.10
Nodes (25): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, DropdownMenuCheckboxItem, SheetContent, SheetContentProps (+17 more)

### Community 353 - "Community 353"
Cohesion: 0.13
Nodes (24): BookingStatus, MocHazard, MocMitigation, MocMitigationStatus, MocPhase, MocRisk, MocSignature, MocStatus (+16 more)

## Knowledge Gaps
- **1045 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1040 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 88` to `Community 2`, `Community 4`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 64`, `Community 333`, `Community 81`, `exam-form.tsx`, `Community 87`, `Community 89`, `manage-cap-dialog.tsx`, `Community 93`, `Community 349`, `Community 96`, `scroll-area.tsx`, `Community 99`, `chart.tsx`, `Community 104`, `page.tsx`, `Community 110`, `Community 114`, `Community 242`, `Community 117`, `Community 118`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 134`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 169`, `Community 170`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `chart.tsx`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `chart.tsx` to `Community 64`, `Community 34`, `Community 67`, `Community 11`, `Community 118`, `Community 23`, `Community 88`, `Community 54`, `Community 31`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1045 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08780841799709724 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._