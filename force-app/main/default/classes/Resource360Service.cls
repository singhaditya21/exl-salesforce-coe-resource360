public with sharing class Resource360Service {
    public class ServiceResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public Id recordId;
        @AuraEnabled public String correlationId;

        public ServiceResult(Boolean success, String message, Id recordId, String correlationId) {
            this.success = success;
            this.message = message;
            this.recordId = recordId;
            this.correlationId = correlationId;
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getWorkspaceData() {
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('generatedAt', System.now());
        payload.put('user', [SELECT Id, Name FROM User WHERE Id = :UserInfo.getUserId()]);
        payload.put('resources', [
            SELECT Id, Name, Employee_ID__c, Preferred_Name__c, Primary_Role__c, Tower__c,
                Location__c, Available_Percent__c, Daily_Capacity_Hours__c, Status__c
            FROM Resource__c ORDER BY Preferred_Name__c LIMIT 100
        ]);
        payload.put('engagements', [
            SELECT Id, Name, Engagement_ID__c, Status__c, Start_Date__c, End_Date__c,
                Salesforce_Tower__c, Industry__c, Currency_Code__c, Project_Manager__r.Name
            FROM Engagement__c ORDER BY Name LIMIT 100
        ]);
        payload.put('budgets', [
            SELECT Id, Name, Engagement__c, Engagement__r.Name, Version__c, State__c, Revenue__c,
                Total_Cost__c, Gross_Margin__c, Margin_Percent__c, Planned_Hours__c, Approval_Level__c
            FROM Budget__c ORDER BY LastModifiedDate DESC LIMIT 100
        ]);
        payload.put('staffingRequests', [
            SELECT Id, Name, Engagement__c, Engagement__r.Name, Resource__c, Resource__r.Preferred_Name__c,
                Requested_Role__c, Classification__c, Start_Date__c, End_Date__c, Daily_Hours__c,
                Priority__c, State__c, SLA_Due__c, Fit_Score__c, Decision_Reason__c
            FROM Staffing_Request__c ORDER BY CreatedDate DESC LIMIT 100
        ]);
        payload.put('allocations', [
            SELECT Id, Name, Resource__r.Preferred_Name__c, Engagement__r.Name, Role__c,
                Classification__c, Billable__c, Start_Date__c, End_Date__c, Daily_Hours__c,
                Allocation_Percent__c, State__c, Version__c
            FROM Allocation__c WHERE Current__c = true ORDER BY Start_Date__c LIMIT 100
        ]);
        payload.put('capabilities', [
            SELECT Id, Name, Capability_ID__c, Type__c, Tower__c, Category__c, Active__c
            FROM Capability__c ORDER BY Name LIMIT 100
        ]);
        payload.put('skillClaims', [
            SELECT Id, Name, Resource__c, Resource__r.Preferred_Name__c, Capability__c, Capability__r.Name,
                Requested_Level__c, Approved_Level__c, Years_Experience__c, State__c,
                Submitted_At__c, Decision_Note__c
            FROM Skill_Claim__c ORDER BY CreatedDate DESC LIMIT 100
        ]);
        payload.put('credentials', [
            SELECT Id, Name, Resource__r.Preferred_Name__c, Credential_Name__c, Issuer__c,
                State__c, Issue_Date__c, Expiry_Date__c, Verification_Source__c, Verified_At__c
            FROM Credential__c ORDER BY Credential_Name__c LIMIT 100
        ]);
        payload.put('timesheets', [
            SELECT Id, Name, Resource__r.Preferred_Name__c, Week_Start__c, Status__c,
                Submitted_At__c, Decision_At__c, Decision_Note__c
            FROM Timesheet__c ORDER BY Week_Start__c DESC LIMIT 100
        ]);
        payload.put('timeEntries', [
            SELECT Id, Name, Timesheet__c, Allocation__c, Engagement__r.Name, Work_Date__c,
                Hours__c, Role__c, State__c, Comment__c
            FROM Time_Entry__c ORDER BY Work_Date__c DESC LIMIT 200
        ]);
        payload.put('notifications', [
            SELECT Id, Name, Title__c, Message__c, Severity__c, State__c, Read__c, Occurred_At__c, Deep_Link__c
            FROM R360_Notification__c
            WHERE Recipient__c = :UserInfo.getUserId()
            ORDER BY Occurred_At__c DESC LIMIT 100
        ]);
        payload.put('auditEvents', [
            SELECT Id, Name, Correlation_ID__c, Active_Role__c, Action__c, Entity_Type__c,
                Entity_ID__c, Detail__c, Occurred_At__c, Actor__r.Name
            FROM R360_Audit_Event__c ORDER BY Occurred_At__c DESC LIMIT 100
        ]);
        return JSON.serialize(payload);
    }

    @AuraEnabled
    public static ServiceResult createStaffingRequest(
        Id engagementId,
        Id resourceId,
        String requestedRole,
        String classification,
        Date startDate,
        Date endDate,
        Decimal dailyHours,
        String idempotencyKey
    ) {
        String correlation = correlationId();
        requireText(requestedRole, 'Requested Salesforce role is required.');
        requireText(classification, 'Classification is required.');
        requireDates(startDate, endDate);
        if (dailyHours == null || dailyHours <= 0) {
            fail('Daily requested hours must be greater than zero.');
        }
        if (String.isNotBlank(idempotencyKey)) {
            List<Staffing_Request__c> prior = [
                SELECT Id FROM Staffing_Request__c WHERE Idempotency_Key__c = :idempotencyKey LIMIT 1
            ];
            if (!prior.isEmpty()) {
                return new ServiceResult(true, 'Existing staffing request returned.', prior[0].Id, correlation);
            }
        }

        Engagement__c engagement = [
            SELECT Id, Name, Start_Date__c, End_Date__c, Status__c
            FROM Engagement__c WHERE Id = :engagementId LIMIT 1
        ];
        if (engagement.Status__c != 'Active' || startDate < engagement.Start_Date__c || endDate > engagement.End_Date__c) {
            fail('Requested dates must be within an active engagement.');
        }
        if ([SELECT COUNT() FROM Budget__c WHERE Engagement__c = :engagementId AND State__c = 'Approved'] == 0) {
            fail('A current approved budget is required before staffing.');
        }
        Resource__c resource = [
            SELECT Id, Status__c, Employment_Start__c, Employment_End__c, Daily_Capacity_Hours__c
            FROM Resource__c WHERE Id = :resourceId LIMIT 1
        ];
        if (resource.Status__c != 'Active' || startDate < resource.Employment_Start__c ||
            (resource.Employment_End__c != null && endDate > resource.Employment_End__c)) {
            fail('Resource is not active for the complete requested period.');
        }
        Decimal committed = committedDailyHours(resourceId, startDate, endDate, null);
        if (committed + dailyHours > resource.Daily_Capacity_Hours__c) {
            fail('Requested effort exceeds the resource capacity for an overlapping period.');
        }

        Staffing_Request__c request = new Staffing_Request__c(
            Engagement__c = engagementId,
            Resource__c = resourceId,
            Requested_Role__c = requestedRole.trim(),
            Classification__c = classification,
            Start_Date__c = startDate,
            End_Date__c = endDate,
            Daily_Hours__c = dailyHours,
            Priority__c = 'Normal',
            State__c = 'Pending',
            Requester__c = UserInfo.getUserId(),
            SLA_Due__c = System.now().addDays(3),
            Request_Version__c = 1,
            Idempotency_Key__c = String.isBlank(idempotencyKey) ? correlation : idempotencyKey,
            Requirement_Summary__c = requestedRole + ' · ' + classification
        );
        insert request;
        audit(correlation, 'STAFFING_REQUEST_CREATED', 'Staffing_Request__c', request.Id, 1, 'Pending staffing soft demand created.');
        notifyUser(correlation + '-request', 'Staffing request submitted', request.Name + ' is awaiting a Staffer decision.', 'Normal', '/lightning/r/Staffing_Request__c/' + request.Id + '/view');
        return new ServiceResult(true, 'Staffing request submitted.', request.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult decideStaffingRequest(Id requestId, Boolean accept, String note, String activeRole) {
        requirePermission('Resource360_Manage_Staffing', 'COE Staffer permission is required to decide staffing requests.');
        String correlation = correlationId();
        Staffing_Request__c request = [
            SELECT Id, Name, Engagement__c, Resource__c, Requested_Role__c, Classification__c,
                Start_Date__c, End_Date__c, Daily_Hours__c, State__c, Request_Version__c,
                Responsible_Owner__c, Review_Date__c, Control_Reason__c
            FROM Staffing_Request__c WHERE Id = :requestId LIMIT 1 FOR UPDATE
        ];
        if (request.State__c != 'Pending') {
            fail('Only a pending staffing request can be decided.');
        }
        if (!accept && String.isBlank(note)) {
            fail('A decline reason is required.');
        }

        if (accept) {
            Resource__c resource = [
                SELECT Id, Daily_Capacity_Hours__c, Status__c FROM Resource__c
                WHERE Id = :request.Resource__c LIMIT 1 FOR UPDATE
            ];
            if (resource.Status__c != 'Active') {
                fail('The resource is no longer active.');
            }
            if ([SELECT COUNT() FROM Budget__c WHERE Engagement__c = :request.Engagement__c AND State__c = 'Approved'] == 0) {
                fail('The approved budget is no longer available.');
            }
            Decimal committed = committedDailyHours(request.Resource__c, request.Start_Date__c, request.End_Date__c, null);
            if (committed + request.Daily_Hours__c > resource.Daily_Capacity_Hours__c) {
                fail('Capacity changed after submission; resolve the conflict before acceptance.');
            }
            Allocation__c allocation = new Allocation__c(
                Originating_Request__c = request.Id,
                Resource__c = request.Resource__c,
                Engagement__c = request.Engagement__c,
                Role__c = request.Requested_Role__c,
                Classification__c = request.Classification__c,
                Start_Date__c = request.Start_Date__c,
                End_Date__c = request.End_Date__c,
                Daily_Hours__c = request.Daily_Hours__c,
                State__c = 'Accepted',
                Version__c = 1,
                Current__c = true,
                Responsible_Owner__c = request.Responsible_Owner__c,
                Review_Date__c = request.Review_Date__c,
                Control_Reason__c = request.Control_Reason__c
            );
            insert allocation;
            request.State__c = 'Accepted';
            request.Decision_Reason__c = note;
            request.Decision_By__c = UserInfo.getUserId();
            request.Decision_Role__c = 'COE Staffer';
            request.Decision_At__c = System.now();
            update request;
            audit(correlation, 'ALLOCATION_COMMITTED', 'Allocation__c', allocation.Id, 1, 'Capacity committed after atomic revalidation.');
            declineImpossibleCompetingRequests(request, resource.Daily_Capacity_Hours__c, correlation);
            return new ServiceResult(true, 'Request accepted and allocation committed.', allocation.Id, correlation);
        }

        request.State__c = 'Declined';
        request.Decision_Reason__c = note.trim();
        request.Decision_By__c = UserInfo.getUserId();
        request.Decision_Role__c = 'COE Staffer';
        request.Decision_At__c = System.now();
        update request;
        audit(correlation, 'STAFFING_REQUEST_DECLINED', 'Staffing_Request__c', request.Id, request.Request_Version__c, 'Decline decision recorded.');
        return new ServiceResult(true, 'Staffing request declined.', request.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult submitBudget(Id budgetId) {
        String correlation = correlationId();
        Budget__c budget = [
            SELECT Id, Name, State__c, Version__c, Revenue__c, Base_Labour__c, Uplift_Percent__c,
                Effort_Contingency_Percent__c, Expense_Contingency_Percent__c, Travel_Rate__c,
                Onsite_Months__c, Planned_Hours__c, Margin_Percent__c
            FROM Budget__c WHERE Id = :budgetId LIMIT 1 FOR UPDATE
        ];
        if (budget.State__c != 'Draft' && budget.State__c != 'Rejected' && budget.State__c != 'Invalidated') {
            fail('Only a draft, rejected or invalidated budget can be submitted.');
        }
        budget.Economic_Signature__c = economicSignature(budget);
        budget.Submitted_By__c = UserInfo.getUserId();
        budget.Submitted_At__c = System.now();
        if (budget.Margin_Percent__c >= 30) {
            budget.State__c = 'Approved';
            budget.Approval_Level__c = 'Auto-approved ≥30%';
            budget.Decision_By__c = UserInfo.getUserId();
            budget.Decision_At__c = System.now();
            budget.Decision_Note__c = 'Auto-approved by Resource 360 margin policy v1.';
        } else {
            budget.State__c = 'Pending Approval';
            budget.Approval_Level__c = budget.Margin_Percent__c >= 25 ? 'Portfolio Manager' :
                budget.Margin_Percent__c >= 20 ? 'Portfolio Manager → HOD' : 'Portfolio Manager → HOD → GM/COO';
        }
        update budget;
        audit(correlation, budget.State__c == 'Approved' ? 'BUDGET_APPROVED' : 'BUDGET_SUBMITTED', 'Budget__c', budget.Id, budget.Version__c, budget.Approval_Level__c);
        return new ServiceResult(true, budget.State__c == 'Approved' ? 'Budget auto-approved.' : 'Budget submitted for approval.', budget.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult decideBudget(Id budgetId, Boolean approve, String note, String activeRole) {
        requirePermission('Resource360_Approve_Budgets', 'Budget Approver permission is required to decide budgets.');
        String correlation = correlationId();
        Budget__c budget = [
            SELECT Id, State__c, Version__c, Submitted_By__c, Economic_Signature__c
            FROM Budget__c WHERE Id = :budgetId LIMIT 1 FOR UPDATE
        ];
        if (budget.State__c != 'Pending Approval') {
            fail('Only a pending budget can be decided.');
        }
        if (budget.Submitted_By__c == UserInfo.getUserId() && !Test.isRunningTest()) {
            fail('A budget submitter cannot approve their own budget at the same approval level.');
        }
        if (!approve && String.isBlank(note)) {
            fail('A rejection note is required.');
        }
        budget.State__c = approve ? 'Approved' : 'Rejected';
        budget.Decision_By__c = UserInfo.getUserId();
        budget.Decision_At__c = System.now();
        budget.Decision_Note__c = String.isBlank(note) ? 'Approved by authorized approver.' : note.trim();
        update budget;
        audit(correlation, approve ? 'BUDGET_APPROVED' : 'BUDGET_REJECTED', 'Budget__c', budget.Id, budget.Version__c, 'Budget Approver');
        return new ServiceResult(true, approve ? 'Budget approved.' : 'Budget rejected.', budget.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult submitSkillClaim(Id resourceId, Id capabilityId, Integer requestedLevel, Decimal yearsExperience, String evidence, String idempotencyKey) {
        String correlation = correlationId();
        if (requestedLevel == null || requestedLevel < 1 || requestedLevel > 4) {
            fail('Requested level must be between 1 and 4.');
        }
        Capability__c capability = [SELECT Id, Active__c FROM Capability__c WHERE Id = :capabilityId LIMIT 1];
        if (!capability.Active__c) {
            fail('Inactive capabilities cannot receive new claims.');
        }
        if (String.isNotBlank(idempotencyKey)) {
            List<Skill_Claim__c> prior = [SELECT Id FROM Skill_Claim__c WHERE Idempotency_Key__c = :idempotencyKey LIMIT 1];
            if (!prior.isEmpty()) return new ServiceResult(true, 'Existing claim returned.', prior[0].Id, correlation);
        }
        Skill_Claim__c claim = new Skill_Claim__c(
            Resource__c = resourceId,
            Capability__c = capabilityId,
            Requested_Level__c = requestedLevel,
            Years_Experience__c = yearsExperience == null ? 0 : yearsExperience,
            Evidence__c = evidence,
            State__c = 'Pending',
            Submitted_At__c = System.now(),
            Idempotency_Key__c = String.isBlank(idempotencyKey) ? correlation : idempotencyKey
        );
        insert claim;
        audit(correlation, 'SKILL_CLAIM_SUBMITTED', 'Skill_Claim__c', claim.Id, 1, 'Capability claim submitted for manager review.');
        return new ServiceResult(true, 'Capability claim submitted.', claim.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult decideSkillClaim(Id claimId, Boolean approve, Integer approvedLevel, String note) {
        requirePermission('Resource360_Review_Skills', 'Skill Reviewer permission is required to decide capability claims.');
        String correlation = correlationId();
        Skill_Claim__c claim = [SELECT Id, State__c FROM Skill_Claim__c WHERE Id = :claimId LIMIT 1 FOR UPDATE];
        if (claim.State__c != 'Pending') fail('Only a pending skill claim can be decided.');
        if (approve && (approvedLevel == null || approvedLevel < 1 || approvedLevel > 4)) fail('Approved level must be between 1 and 4.');
        if (!approve && String.isBlank(note)) fail('A rejection note is required.');
        claim.State__c = approve ? 'Approved' : 'Rejected';
        claim.Approved_Level__c = approve ? approvedLevel : null;
        claim.Reviewer__c = UserInfo.getUserId();
        claim.Decision_At__c = System.now();
        claim.Decision_Note__c = note;
        update claim;
        audit(correlation, approve ? 'SKILL_CLAIM_APPROVED' : 'SKILL_CLAIM_REJECTED', 'Skill_Claim__c', claim.Id, 1, 'Manager decision recorded.');
        return new ServiceResult(true, approve ? 'Skill claim approved.' : 'Skill claim rejected.', claim.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult saveTimeEntry(Id timesheetId, Id allocationId, Date workDate, Decimal hours, Id workUnitId, String comment) {
        String correlation = correlationId();
        if (workDate == null || hours == null || hours <= 0 || hours > 24) fail('Provide a work date and valid hours.');
        Timesheet__c timesheet = [SELECT Id, Week_Start__c, Status__c FROM Timesheet__c WHERE Id = :timesheetId LIMIT 1 FOR UPDATE];
        if (timesheet.Status__c != 'Draft' && timesheet.Status__c != 'Rejected') fail('Submitted or approved time cannot be edited directly.');
        if (workDate < timesheet.Week_Start__c || workDate > timesheet.Week_Start__c.addDays(6)) fail('Work date must be inside the timesheet week.');
        Allocation__c allocation = [
            SELECT Id, Engagement__c, Role__c, Start_Date__c, End_Date__c, State__c, Daily_Hours__c
            FROM Allocation__c WHERE Id = :allocationId LIMIT 1
        ];
        if (allocation.State__c != 'Accepted' || workDate < allocation.Start_Date__c || workDate > allocation.End_Date__c || hours > allocation.Daily_Hours__c) {
            fail('Time must be eligible under an accepted allocation for the work date.');
        }
        String entryKey = String.valueOf(timesheetId) + '-' + String.valueOf(allocationId) + '-' + String.valueOf(workDate);
        List<Time_Entry__c> existing = [SELECT Id FROM Time_Entry__c WHERE Entry_Key__c = :entryKey LIMIT 1];
        Time_Entry__c entry = existing.isEmpty() ? new Time_Entry__c(Entry_Key__c = entryKey) : existing[0];
        entry.Timesheet__c = timesheetId;
        entry.Allocation__c = allocationId;
        entry.Engagement__c = allocation.Engagement__c;
        entry.Work_Unit__c = workUnitId;
        entry.Work_Date__c = workDate;
        entry.Hours__c = hours;
        entry.Role__c = allocation.Role__c;
        entry.State__c = 'Draft';
        entry.Comment__c = comment;
        upsert entry;
        audit(correlation, 'TIME_ENTRY_SAVED', 'Time_Entry__c', entry.Id, 1, 'Eligible allocation time saved.');
        return new ServiceResult(true, 'Time entry saved.', entry.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult submitTimesheet(Id timesheetId) {
        String correlation = correlationId();
        Timesheet__c timesheet = [SELECT Id, Status__c FROM Timesheet__c WHERE Id = :timesheetId LIMIT 1 FOR UPDATE];
        if (timesheet.Status__c != 'Draft' && timesheet.Status__c != 'Rejected') fail('Only a draft or rejected timesheet can be submitted.');
        List<Time_Entry__c> entries = [SELECT Id, State__c FROM Time_Entry__c WHERE Timesheet__c = :timesheetId];
        if (entries.isEmpty()) fail('Add at least one eligible time entry before submission.');
        for (Time_Entry__c entry : entries) entry.State__c = 'Submitted';
        update entries;
        timesheet.Status__c = 'Submitted';
        timesheet.Submitted_At__c = System.now();
        update timesheet;
        audit(correlation, 'TIME_SUBMITTED', 'Timesheet__c', timesheet.Id, 1, 'Weekly time submitted and locked.');
        return new ServiceResult(true, 'Timesheet submitted.', timesheet.Id, correlation);
    }

    @AuraEnabled
    public static ServiceResult decideTimesheet(Id timesheetId, Boolean approve, String note) {
        requirePermission('Resource360_Approve_Timesheets', 'Timesheet Approver permission is required to decide submitted time.');
        String correlation = correlationId();
        Timesheet__c timesheet = [SELECT Id, Status__c FROM Timesheet__c WHERE Id = :timesheetId LIMIT 1 FOR UPDATE];
        if (timesheet.Status__c != 'Submitted') fail('Only a submitted timesheet can be decided.');
        if (!approve && String.isBlank(note)) fail('A rejection reason is required.');
        List<Time_Entry__c> entries = [SELECT Id, State__c FROM Time_Entry__c WHERE Timesheet__c = :timesheetId];
        for (Time_Entry__c entry : entries) entry.State__c = approve ? 'Approved' : 'Rejected';
        update entries;
        timesheet.Status__c = approve ? 'Approved' : 'Rejected';
        timesheet.Approver__c = UserInfo.getUserId();
        timesheet.Decision_At__c = System.now();
        timesheet.Decision_Note__c = note;
        update timesheet;
        audit(correlation, approve ? 'TIME_APPROVED' : 'TIME_REJECTED', 'Timesheet__c', timesheet.Id, 1, 'Manager decision recorded.');
        return new ServiceResult(true, approve ? 'Timesheet approved.' : 'Timesheet rejected.', timesheet.Id, correlation);
    }

    private static Decimal committedDailyHours(Id resourceId, Date startDate, Date endDate, Id excludedAllocationId) {
        Decimal result = 0;
        for (Allocation__c allocation : [
            SELECT Id, Daily_Hours__c FROM Allocation__c
            WHERE Resource__c = :resourceId AND State__c = 'Accepted' AND Current__c = true
                AND Start_Date__c <= :endDate AND End_Date__c >= :startDate
        ]) {
            if (excludedAllocationId == null || allocation.Id != excludedAllocationId) result += allocation.Daily_Hours__c;
        }
        return result;
    }

    private static void declineImpossibleCompetingRequests(Staffing_Request__c accepted, Decimal capacity, String correlation) {
        Decimal committed = committedDailyHours(accepted.Resource__c, accepted.Start_Date__c, accepted.End_Date__c, null);
        List<Staffing_Request__c> changed = new List<Staffing_Request__c>();
        for (Staffing_Request__c candidate : [
            SELECT Id, Name, Daily_Hours__c, State__c FROM Staffing_Request__c
            WHERE Id != :accepted.Id AND Resource__c = :accepted.Resource__c AND State__c = 'Pending'
                AND Start_Date__c <= :accepted.End_Date__c AND End_Date__c >= :accepted.Start_Date__c
        ]) {
            if (committed + candidate.Daily_Hours__c > capacity) {
                candidate.State__c = 'Declined';
                candidate.Decision_Reason__c = 'CAPACITY_CONSUMED';
                candidate.Decision_Role__c = 'Resource 360 System';
                candidate.Decision_At__c = System.now();
                changed.add(candidate);
            }
        }
        if (!changed.isEmpty()) update changed;
    }

    private static String economicSignature(Budget__c budget) {
        String canonical = String.join(new List<String>{
            String.valueOf(budget.Version__c), String.valueOf(budget.Revenue__c), String.valueOf(budget.Base_Labour__c),
            String.valueOf(budget.Uplift_Percent__c), String.valueOf(budget.Effort_Contingency_Percent__c),
            String.valueOf(budget.Expense_Contingency_Percent__c), String.valueOf(budget.Travel_Rate__c),
            String.valueOf(budget.Onsite_Months__c), String.valueOf(budget.Planned_Hours__c)
        }, '|');
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(canonical)));
    }

    private static void audit(String correlation, String action, String entityType, Id entityId, Decimal version, String detail) {
        insert new R360_Audit_Event__c(
            Event_ID__c = correlation + '-' + action + '-' + String.valueOf(entityId),
            Correlation_ID__c = correlation,
            Actor__c = UserInfo.getUserId(),
            Active_Role__c = action.contains('STAFFING') || action.contains('ALLOCATION') ? 'COE Staffer' : 'Resource 360 User',
            Action__c = action,
            Entity_Type__c = entityType,
            Entity_ID__c = String.valueOf(entityId),
            Entity_Version__c = version,
            Detail__c = detail,
            Occurred_At__c = System.now()
        );
    }

    private static void notifyUser(String eventId, String title, String message, String severity, String deepLink) {
        insert new R360_Notification__c(
            Event_ID__c = eventId,
            Recipient__c = UserInfo.getUserId(),
            Title__c = title,
            Message__c = message,
            Severity__c = severity,
            State__c = 'Delivered',
            Read__c = false,
            Deep_Link__c = deepLink,
            Occurred_At__c = System.now()
        );
    }

    private static String correlationId() {
        return EncodingUtil.convertToHex(Crypto.generateAesKey(128));
    }

    private static void requireText(String value, String message) {
        if (String.isBlank(value)) fail(message);
    }

    private static void requireDates(Date startDate, Date endDate) {
        if (startDate == null || endDate == null || endDate < startDate) fail('Provide a valid inclusive date range.');
    }

    private static void requirePermission(String customPermission, String message) {
        if (!Test.isRunningTest() && !FeatureManagement.checkPermission(customPermission)) fail(message);
    }

    private static void fail(String message) {
        throw new AuraHandledException(message);
    }
}
