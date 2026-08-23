public inherited sharing class Resource360StaffingService {
    public static Resource360Service.ServiceResult create(Id engagementId, Id resourceId, String requestedRole, String classification, Date startDate, Date endDate, Decimal dailyHours, Id responsibleOwnerId, Date reviewDate, String controlReason, String sourceCriteria, String idempotencyKey) {
        String correlation = correlationId();
        requireText(requestedRole, 'Requested Salesforce role is required.');requestedRole=Resource360RoleCatalog.requireActive(requestedRole);
        requireText(classification, 'Classification is required.');
        R360_Classification__mdt classificationPolicy=Resource360Classification.requireActive(classification);
        requireDates(startDate, endDate);
        Boolean pastDateOverride=validatePastDate(startDate,controlReason);
        if (dailyHours == null || dailyHours <= 0) fail('Daily requested hours must be greater than zero.');
        String fingerprint = hash(String.join(new List<String>{String.valueOf(engagementId), String.valueOf(resourceId), requestedRole, classification, String.valueOf(startDate), String.valueOf(endDate), String.valueOf(dailyHours), String.valueOf(responsibleOwnerId), String.valueOf(reviewDate), controlReason}, '|'));
        if (String.isNotBlank(idempotencyKey)) {
            List<Staffing_Request__c> prior = [SELECT Id, Request_Fingerprint__c FROM Staffing_Request__c WHERE Idempotency_Key__c = :idempotencyKey WITH USER_MODE LIMIT 1];
            if (!prior.isEmpty()) {
                if (prior[0].Request_Fingerprint__c != fingerprint) fail('The idempotency key was already used with a different staffing payload.');
                return result(true, 'Existing staffing request returned.', prior[0].Id, correlation);
            }
        }

        Engagement__c engagement = [SELECT Id, Start_Date__c, End_Date__c, Status__c FROM Engagement__c WHERE Id = :engagementId WITH USER_MODE LIMIT 1];
        if (engagement.Status__c != 'Active' || startDate < engagement.Start_Date__c || endDate > engagement.End_Date__c) fail('Requested dates must be within an active engagement.');
        Budget__c budget = Resource360BudgetService.currentApprovedBudget(engagementId, startDate, endDate);
        if (classificationPolicy.Requires_Control__c) {
            if (responsibleOwnerId == null || reviewDate == null || String.isBlank(controlReason)) fail('Unbilled staffing requires a responsible owner, review date and control reason.');
            if (reviewDate < Date.today() || reviewDate > endDate) fail('Unbilled review date must be current and within the staffing range.');
        }
        if (classificationPolicy.Requires_SOW__c) requireSow(engagementId, startDate, endDate);
        requireNoDuplicate(engagementId,resourceId,requestedRole,classification,startDate,endDate);
        Resource360CalendarService.CapacityCheck check = Resource360CalendarService.checkCapacity(resourceId, startDate, endDate, dailyHours, null);
        if (!check.allowed) fail(check.message);

        Integer expiryHours = Integer.valueOf(Resource360Policy.numberValue('Staffing_Expiry_Hours', 72));
        Staffing_Request__c request = new Staffing_Request__c(
            Engagement__c=engagementId, Resource__c=resourceId, Requested_Role__c=requestedRole.trim(), Classification__c=classification,
            Start_Date__c=startDate, End_Date__c=endDate, Daily_Hours__c=dailyHours, Priority__c='Normal', State__c='Pending',
            Requester__c=UserInfo.getUserId(), SLA_Due__c=System.now().addHours(expiryHours), Request_Version__c=1,
            Idempotency_Key__c=String.isBlank(idempotencyKey) ? correlation : idempotencyKey, Request_Fingerprint__c=fingerprint,
            Requirement_Summary__c=requestedRole + ' · ' + classification, Responsible_Owner__c=responsibleOwnerId,
            Review_Date__c=reviewDate, Control_Reason__c=controlReason, Source_Criteria__c=sourceCriteria,
            Budget_Signature__c=budget.Economic_Signature__c
        );
        request = (Staffing_Request__c)Resource360Security.createable(new List<SObject>{request})[0];
        insert request;
        request = [SELECT Id, Name, Request_Version__c, Requester__c FROM Staffing_Request__c WHERE Id = :request.Id WITH USER_MODE];
        recordEvent(correlation, 'STAFFING_REQUEST_CREATED', request.Id, request.Request_Version__c, pastDateOverride?'PAST_DATE_OVERRIDE':'REQUEST_SUBMITTED', pastDateOverride?'Pending staffing soft demand created with an authorized past-date override: '+controlReason:'Pending staffing soft demand created.', 'Draft', 'Pending');
        Resource360EventService.enqueueNotification(correlation + '-request', request.Requester__c, 'Staffing request submitted', request.Name + ' is awaiting a Staffer decision.', 'Normal', '/lightning/r/Staffing_Request__c/' + request.Id + '/view');
        return result(true, 'Staffing request submitted.', request.Id, correlation);
    }

    public static Resource360Service.ServiceResult decide(Id requestId, Boolean accept, String note) {
        Resource360Security.requirePermission('Resource360_Manage_Staffing', 'COE Staffer permission is required to decide staffing requests.');
        String correlation = correlationId();
        Staffing_Request__c request = [SELECT Id, Name, Engagement__c, Resource__c, Requested_Role__c, Classification__c, Start_Date__c, End_Date__c, Daily_Hours__c, State__c, Request_Version__c, Requester__c, Budget_Signature__c, Responsible_Owner__c, Review_Date__c, Control_Reason__c FROM Staffing_Request__c WHERE Id = :requestId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if (request.State__c != 'Pending') fail('Only a pending staffing request can be decided.');
        if (!accept && String.isBlank(note)) fail('A decline reason is required.');
        String role = Resource360Security.decisionRole('Resource360_Manage_Staffing', 'COE Staffer');
        if (!accept) {
            request.State__c='Declined'; request.Decision_Reason__c=note.trim(); request.Decision_By__c=UserInfo.getUserId(); request.Decision_Role__c=role; request.Decision_At__c=System.now(); request.Decision_Correlation_ID__c=correlation;
            update request;
            recordEvent(correlation, 'STAFFING_REQUEST_DECLINED', request.Id, request.Request_Version__c, 'STAFFER_DECLINED', note, 'Pending', 'Declined');
            Resource360EventService.enqueueNotification(correlation + '-decision', request.Requester__c, 'Staffing request declined', request.Name + ' was declined: ' + note, 'High', '/lightning/r/Staffing_Request__c/' + request.Id + '/view');
            return result(true, 'Request declined with attributable evidence.', request.Id, correlation);
        }

        Budget__c budget = Resource360BudgetService.currentApprovedBudget(request.Engagement__c, request.Start_Date__c, request.End_Date__c);
        if (budget.Economic_Signature__c != request.Budget_Signature__c) fail('The approved budget changed after request submission; resubmit the staffing request.');
        Resource360CalendarService.CapacityCheck check = Resource360CalendarService.checkCapacity(request.Resource__c, request.Start_Date__c, request.End_Date__c, request.Daily_Hours__c, null);
        if (!check.allowed) fail('Capacity changed after submission. ' + check.message);
        Allocation__c allocation = new Allocation__c(Originating_Request__c=request.Id, Resource__c=request.Resource__c, Engagement__c=request.Engagement__c, Role__c=request.Requested_Role__c, Classification__c=request.Classification__c, Billable_Snapshot__c=Resource360Classification.isBillable(request.Classification__c), Start_Date__c=request.Start_Date__c, End_Date__c=request.End_Date__c, Daily_Hours__c=request.Daily_Hours__c, State__c='Accepted', Version__c=1, Current__c=true, Responsible_Owner__c=request.Responsible_Owner__c, Review_Date__c=request.Review_Date__c, Control_Reason__c=request.Control_Reason__c);
        insert allocation;
        request.State__c='Accepted'; request.Decision_Reason__c=String.isBlank(note) ? 'Capacity, budget and scope revalidated.' : note.trim(); request.Decision_By__c=UserInfo.getUserId(); request.Decision_Role__c=role; request.Decision_At__c=System.now(); request.Decision_Correlation_ID__c=correlation;
        update request;
        recordEvent(correlation, 'ALLOCATION_COMMITTED', allocation.Id, 1, 'ATOMIC_ACCEPTANCE', 'Capacity committed after per-business-day revalidation.', null, 'Accepted');
        declineImpossibleCompetingRequests(request, correlation);
        Resource360EventService.enqueueNotification(correlation + '-accepted', request.Requester__c, 'Staffing request accepted', request.Name + ' was accepted and capacity is committed.', 'Normal', '/lightning/r/Allocation__c/' + allocation.Id + '/view');
        return result(true, 'Request accepted and allocation committed.', allocation.Id, correlation);
    }

    public static Resource360Service.ServiceResult modifyAllocation(Id allocationId, Date startDate, Date endDate, Decimal dailyHours, String roleName, String classification, Id responsibleOwnerId, Date reviewDate, String reason) {
        Resource360Security.requirePermission('Resource360_Manage_Staffing', 'COE Staffer permission is required to modify allocations.');
        requireDates(startDate, endDate); requireText(reason, 'A modification reason is required.');
        Boolean pastDateOverride=validatePastDate(startDate,reason);
        String correlation = correlationId();
        Allocation__c prior = [SELECT Id, Originating_Request__c, Resource__c, Engagement__c, Role__c, Classification__c, Billable_Snapshot__c, Start_Date__c, End_Date__c, Daily_Hours__c, State__c, Version__c, Current__c, Responsible_Owner__c, Review_Date__c, Control_Reason__c FROM Allocation__c WHERE Id=:allocationId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if (!prior.Current__c || prior.State__c != 'Accepted') fail('Only a current accepted allocation can be modified.');
        Resource360BudgetService.currentApprovedBudget(prior.Engagement__c, startDate, endDate);
        Resource360CalendarService.CapacityCheck check = Resource360CalendarService.checkCapacity(prior.Resource__c, startDate, endDate, dailyHours, prior.Id);
        if (!check.allowed) fail(check.message);
        String nextClassification = String.isBlank(classification) ? prior.Classification__c : classification;String nextRole=String.isBlank(roleName)?prior.Role__c:Resource360RoleCatalog.requireActive(roleName);
        R360_Classification__mdt nextPolicy=Resource360Classification.requireActive(nextClassification);
        if (nextPolicy.Requires_Control__c && (responsibleOwnerId == null || reviewDate == null || String.isBlank(reason))) fail('The selected classification requires owner, review date and reason.');
        if(nextPolicy.Requires_SOW__c)requireSow(prior.Engagement__c,startDate,endDate);
        prior.Current__c=false; prior.State__c='Superseded'; update prior;
        Allocation__c next = new Allocation__c(Parent_Allocation__c=prior.Id, Originating_Request__c=prior.Originating_Request__c, Resource__c=prior.Resource__c, Engagement__c=prior.Engagement__c, Role__c=nextRole, Classification__c=nextClassification, Billable_Snapshot__c=nextPolicy.Billable__c, Start_Date__c=startDate, End_Date__c=endDate, Daily_Hours__c=dailyHours, State__c='Accepted', Version__c=prior.Version__c+1, Current__c=true, Responsible_Owner__c=responsibleOwnerId, Review_Date__c=reviewDate, Control_Reason__c=reason);
        insert next;
        recordEvent(correlation, 'ALLOCATION_VERSION_CREATED', next.Id, next.Version__c, pastDateOverride?'PAST_DATE_OVERRIDE':'EFFECTIVE_DATED_CHANGE', reason, 'Accepted v'+prior.Version__c, 'Accepted v'+next.Version__c);
        return result(true, 'Allocation version created.', next.Id, correlation);
    }

    public static Resource360Service.ServiceResult deallocate(Id allocationId, Date effectiveEndDate, String reason) {
        Resource360Security.requirePermission('Resource360_Manage_Staffing', 'COE Staffer permission is required to end allocations.');
        requireText(reason, 'A deallocation reason is required.');
        String correlation = correlationId();
        Allocation__c prior = [SELECT Id, Originating_Request__c, Resource__c, Engagement__c, Role__c, Classification__c, Billable_Snapshot__c, Start_Date__c, End_Date__c, Daily_Hours__c, State__c, Version__c, Current__c, Responsible_Owner__c, Review_Date__c, Control_Reason__c FROM Allocation__c WHERE Id=:allocationId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if (!prior.Current__c || prior.State__c != 'Accepted') fail('Only a current accepted allocation can be ended.');
        if (effectiveEndDate == null || effectiveEndDate < prior.Start_Date__c || effectiveEndDate > prior.End_Date__c) fail('Effective end must fall inside the allocation range.');
        Boolean pastDateOverride=validatePastDate(effectiveEndDate,reason);
        prior.Current__c=false; prior.State__c='Superseded'; update prior;
        Allocation__c ended = prior.clone(false,false,false,false); ended.Parent_Allocation__c=prior.Id; ended.Start_Date__c=prior.Start_Date__c; ended.End_Date__c=effectiveEndDate; ended.State__c='Accepted'; ended.Version__c=prior.Version__c+1; ended.Current__c=true; ended.Control_Reason__c=reason;
        insert ended;
        recordEvent(correlation, 'ALLOCATION_ENDED', ended.Id, ended.Version__c, pastDateOverride?'PAST_DATE_OVERRIDE':'EFFECTIVE_DEALLOCATION', reason, 'Accepted through '+prior.End_Date__c, 'Accepted through '+effectiveEndDate);
        return result(true, 'Allocation end date shortened with preserved history.', ended.Id, correlation);
    }

    public static Resource360Service.ServiceResult splitAllocation(Id allocationId,Date splitDate,Decimal firstDailyHours,Decimal secondDailyHours,String reason){
        Resource360Security.requirePermission('Resource360_Manage_Staffing','COE Staffer permission is required to split allocations.');requireText(reason,'A split reason is required.');String correlation=correlationId();
        Allocation__c prior=[SELECT Id,Originating_Request__c,Resource__c,Engagement__c,Role__c,Classification__c,Billable_Snapshot__c,Start_Date__c,End_Date__c,Daily_Hours__c,State__c,Version__c,Current__c,Responsible_Owner__c,Review_Date__c,Control_Reason__c FROM Allocation__c WHERE Id=:allocationId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(!prior.Current__c||prior.State__c!='Accepted')fail('Only a current accepted allocation can be split.');if(splitDate==null||splitDate<=prior.Start_Date__c||splitDate>prior.End_Date__c)fail('Split date must be after the start and inside the allocation range.');Boolean pastDateOverride=validatePastDate(splitDate,reason);Decimal leftHours=firstDailyHours==null?prior.Daily_Hours__c:firstDailyHours;Decimal rightHours=secondDailyHours==null?prior.Daily_Hours__c:secondDailyHours;if(leftHours<=0||rightHours<=0)fail('Both split segments require positive daily hours.');
        Resource360CalendarService.CapacityCheck leftCheck=Resource360CalendarService.checkCapacity(prior.Resource__c,prior.Start_Date__c,splitDate.addDays(-1),leftHours,prior.Id);Resource360CalendarService.CapacityCheck rightCheck=Resource360CalendarService.checkCapacity(prior.Resource__c,splitDate,prior.End_Date__c,rightHours,prior.Id);if(!leftCheck.allowed)fail(leftCheck.message);if(!rightCheck.allowed)fail(rightCheck.message);
        prior.Current__c=false;prior.State__c='Superseded';update prior;Decimal nextVersion=prior.Version__c+1;Allocation__c left=segment(prior,prior.Start_Date__c,splitDate.addDays(-1),leftHours,nextVersion,reason);Allocation__c right=segment(prior,splitDate,prior.End_Date__c,rightHours,nextVersion,reason);insert new List<Allocation__c>{left,right};String detail='Allocation split into '+left.Start_Date__c+'–'+left.End_Date__c+' and '+right.Start_Date__c+'–'+right.End_Date__c+': '+reason;recordEvent(correlation,'ALLOCATION_SPLIT',prior.Id,nextVersion,pastDateOverride?'PAST_DATE_OVERRIDE':'EFFECTIVE_DATED_SPLIT',detail,'Accepted v'+prior.Version__c,'Two accepted v'+nextVersion+' segments');return result(true,'Allocation split with two current non-overlapping segments.',right.Id,correlation);
    }

    private static void declineImpossibleCompetingRequests(Staffing_Request__c accepted, String correlation) {
        List<Staffing_Request__c> changed = new List<Staffing_Request__c>();
        for (Staffing_Request__c candidate : [SELECT Id, Name, Requester__c, Daily_Hours__c, Start_Date__c, End_Date__c, Request_Version__c FROM Staffing_Request__c WHERE Id != :accepted.Id AND Resource__c = :accepted.Resource__c AND State__c='Pending' AND Start_Date__c <= :accepted.End_Date__c AND End_Date__c >= :accepted.Start_Date__c WITH USER_MODE]) {
            Resource360CalendarService.CapacityCheck check = Resource360CalendarService.checkCapacity(accepted.Resource__c, candidate.Start_Date__c, candidate.End_Date__c, candidate.Daily_Hours__c, null);
            if (!check.allowed) { candidate.State__c='Declined'; candidate.Decision_Reason__c='CAPACITY_CONSUMED'; candidate.Decision_Role__c='Resource 360 System'; candidate.Decision_At__c=System.now(); candidate.Decision_Correlation_ID__c=correlation; changed.add(candidate); }
        }
        if (!changed.isEmpty()) update changed;
        for (Staffing_Request__c candidate : changed) {
            recordEvent(correlation + '-' + candidate.Id, 'STAFFING_REQUEST_AUTO_DECLINED', candidate.Id, candidate.Request_Version__c, 'CAPACITY_CONSUMED', 'Accepted allocation consumed the remaining capacity.', 'Pending', 'Declined');
            if (candidate.Requester__c != null) Resource360EventService.enqueueNotification(correlation + '-' + candidate.Id, candidate.Requester__c, 'Competing request declined', candidate.Name + ' can no longer be accepted because capacity was committed elsewhere.', 'High', '/lightning/r/Staffing_Request__c/' + candidate.Id + '/view');
        }
    }

    private static void requireSow(Id engagementId, Date startDate, Date endDate) { if ([SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__c=:engagementId AND Reference_Type__c='SOW' AND Status__c='Active' AND Valid_From__c<=:startDate AND (Valid_To__c=null OR Valid_To__c>=:endDate)] == 0) fail('Contractual Shadow requires a current SOW covering the complete range.'); }
    private static void requireNoDuplicate(Id engagementId,Id resourceId,String roleName,String classification,Date startDate,Date endDate){Integer accepted=[SELECT COUNT() FROM Allocation__c WHERE Engagement__c=:engagementId AND Resource__c=:resourceId AND Role__c=:roleName AND Classification__c=:classification AND Start_Date__c=:startDate AND End_Date__c=:endDate AND State__c='Accepted' AND Current__c=true];Integer pending=[SELECT COUNT() FROM Staffing_Request__c WHERE Engagement__c=:engagementId AND Resource__c=:resourceId AND Requested_Role__c=:roleName AND Classification__c=:classification AND Start_Date__c=:startDate AND End_Date__c=:endDate AND State__c='Pending'];if(accepted+pending>0)fail('An identical current allocation or pending request already exists for this engagement, resource, role, classification and date range.');}
    private static Allocation__c segment(Allocation__c prior,Date startDate,Date endDate,Decimal dailyHours,Decimal version,String reason){return new Allocation__c(Parent_Allocation__c=prior.Id,Originating_Request__c=prior.Originating_Request__c,Resource__c=prior.Resource__c,Engagement__c=prior.Engagement__c,Role__c=prior.Role__c,Classification__c=prior.Classification__c,Billable_Snapshot__c=prior.Billable_Snapshot__c,Start_Date__c=startDate,End_Date__c=endDate,Daily_Hours__c=dailyHours,State__c='Accepted',Version__c=version,Current__c=true,Responsible_Owner__c=prior.Responsible_Owner__c,Review_Date__c=prior.Review_Date__c,Control_Reason__c=reason);}
    private static Boolean validatePastDate(Date effectiveDate,String reason){if(effectiveDate==null||effectiveDate>=Date.today())return false;if(String.isBlank(reason))fail('A reason is required for a past-date operation.');Resource360Security.requirePermission('Resource360_Override_Past_Dates','Past-date operations require the dedicated controlled-override permission.');return true;}
    private static void recordEvent(String correlation, String eventType, Id entityId, Decimal version, String reasonCode, String detail, String beforeState, String afterState) { String role=Resource360Security.decisionRole('Resource360_Manage_Staffing','COE Staffer'); Resource360AuditService.record(correlation,role,eventType,eventType.startsWith('ALLOCATION')?'Allocation__c':'Staffing_Request__c',entityId,version,reasonCode,detail,Resource360AuditService.state(beforeState,null),Resource360AuditService.state(afterState,detail)); Resource360EventService.enqueue(correlation,eventType,eventType.startsWith('ALLOCATION')?'Allocation__c':'Staffing_Request__c',entityId,version,new Map<String,Object>{'state'=>afterState}); }
    private static String hash(String value) { return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value))); }
    private static Resource360Service.ServiceResult result(Boolean success,String message,Id recordId,String correlation){return new Resource360Service.ServiceResult(success,message,recordId,correlation);}
    private static String correlationId(){return EncodingUtil.convertToHex(Crypto.generateAesKey(128));}
    private static void requireText(String value,String message){if(String.isBlank(value))fail(message);}
    private static void requireDates(Date startDate,Date endDate){if(startDate==null||endDate==null||endDate<startDate)fail('Provide a valid inclusive date range.');}
    private static void fail(String message){throw new AuraHandledException(message);}
}
