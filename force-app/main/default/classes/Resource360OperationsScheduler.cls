global without sharing class Resource360OperationsScheduler implements Schedulable {
    private class EscalationTier { public Integer days;public String role;public String severity; }
    global void execute(SchedulableContext context) {
        String correlation = EncodingUtil.convertToHex(Crypto.generateAesKey(128));
        Integer overlapMinutes = Integer.valueOf(Resource360Policy.numberValue('Operations_Overlap_Window_Minutes', 120));
        DateTime overlapCutoff = System.now().addMinutes(-overlapMinutes);
        List<R360_Integration_Run__c> activeRuns = [
            SELECT Id, Run_ID__c, Started_At__c FROM R360_Integration_Run__c
            WHERE Entity_Type__c = 'Operational Controls' AND State__c = 'Running' AND Started_At__c >= :overlapCutoff
            LIMIT 1 FOR UPDATE
        ];
        if (!activeRuns.isEmpty()) {
            R360_Integration_Run__c skipped = new R360_Integration_Run__c(
                Run_ID__c = 'OPS-SKIPPED-' + correlation,
                Source_System__c = 'Resource360',
                Entity_Type__c = 'Operational Controls',
                State__c = 'Skipped',
                Started_At__c = System.now(),
                Completed_At__c = System.now(),
                Source_Cutoff__c = System.now(),
                Correlation_ID__c = correlation,
                Contract_Version__c = Resource360GovernanceService.currentContractVersion(),
                Commit_Mode__c = 'Scheduled',
                Processed_Count__c = 0,
                Success_Count__c = 0,
                Failure_Count__c = 0,
                Detail__c = 'Overlap prevented; active run ' + activeRuns[0].Run_ID__c + ' started at ' + activeRuns[0].Started_At__c + '.'
            );
            insert skipped;
            Resource360AuditService.record(correlation, 'Resource 360 System', 'OPERATIONS_RUN_SKIPPED', 'R360_Integration_Run__c', skipped.Id, 1, 'OVERLAP_PREVENTED', skipped.Detail__c, null, new Map<String,Object>{'activeRunId'=>activeRuns[0].Run_ID__c,'overlapWindowMinutes'=>overlapMinutes});
            return;
        }
        R360_Integration_Run__c run = new R360_Integration_Run__c(
            Run_ID__c = 'OPS-' + correlation,
            Source_System__c = 'Resource360',
            Entity_Type__c = 'Operational Controls',
            State__c = 'Running',
            Started_At__c = System.now(),
            Source_Cutoff__c = System.now(),
            Correlation_ID__c = correlation,
            Contract_Version__c = Resource360GovernanceService.currentContractVersion(),
            Commit_Mode__c = 'Scheduled'
        );
        insert run;
        Integer processed = 0;
        try {
            processed += expireStaffing(correlation);
            processed += maintainCredentials(correlation);
            processed += maintainUnbilledEscalations(correlation);
            processed += expireOverallocationReviews(correlation);
            processed += autoApproveEligibleTimesheets(correlation);
            processed += alertOverdueTimesheets(correlation);
            run.State__c = 'Succeeded';
            run.Success_Count__c = processed;
            run.Processed_Count__c = processed;
            run.Completed_At__c = System.now();
            run.Detail__c = 'Staffing SLA, credential, capacity-exception expiry, unbilled escalation and timesheet controls evaluated.';
        } catch (Exception failure) {
            run.State__c = 'Failed';
            run.Failure_Count__c = 1;
            run.Processed_Count__c = processed;
            run.Completed_At__c = System.now();
            run.Detail__c = truncate(failure.getMessage(), 4000);
        }
        update run;
        System.enqueueJob(new Resource360OutboxPublisher());
        System.enqueueJob(new Resource360NotificationDispatcher());
    }

    @TestVisible
    private static Integer expireStaffing(String correlation) {
        List<Staffing_Request__c> expired = [
            SELECT Id, Requester__c, State__c, Request_Version__c FROM Staffing_Request__c
            WHERE State__c = 'Pending' AND SLA_Due__c <= :System.now()
            LIMIT 200 FOR UPDATE
        ];
        for (Staffing_Request__c request : expired) {
            request.State__c = 'Expired';
            request.Decision_At__c = System.now();
            request.Decision_Role__c = 'Resource 360 System';
            request.Decision_Reason__c = 'STAFFING_SLA_EXPIRED';
            request.Decision_Correlation_ID__c = correlation;
        }
        if (!expired.isEmpty()) update expired;
        for (Staffing_Request__c request : expired) {
            Resource360AuditService.record(correlation, 'Resource 360 System', 'STAFFING_REQUEST_EXPIRED', 'Staffing_Request__c', request.Id, request.Request_Version__c, 'SLA_EXPIRED', 'Pending request expired at the configured decision SLA.', Resource360AuditService.state('Pending', null), Resource360AuditService.state('Expired', 'SLA expired'));
            Resource360EventService.enqueue(correlation, 'STAFFING_REQUEST_EXPIRED', 'Staffing_Request__c', request.Id, request.Request_Version__c, new Map<String, Object>{'state' => 'Expired'});
            if (request.Requester__c != null) Resource360EventService.enqueueNotification(correlation + '-' + request.Id, request.Requester__c, 'Staffing request expired', 'The request expired without a Staffer decision and capacity was not committed.', 'High', '/lightning/r/Staffing_Request__c/' + request.Id + '/view');
        }
        return expired.size();
    }

    @TestVisible
    private static Integer maintainCredentials(String correlation) {
        Date today = Date.today();
        Date warningDate = today.addDays(Integer.valueOf(Resource360Policy.numberValue('Credential_Warning_Days', 90)));
        List<Credential__c> credentials = [
            SELECT Id, Resource__c, Resource__r.Salesforce_User__c, Credential_Name__c, State__c, Expiry_Date__c
            FROM Credential__c WHERE State__c NOT IN ('Revoked', 'Expired') AND Expiry_Date__c != null AND Expiry_Date__c <= :warningDate
            LIMIT 200 FOR UPDATE
        ];
        for (Credential__c credential : credentials) {
            String prior = credential.State__c;
            credential.State__c = credential.Expiry_Date__c < today ? 'Expired' : 'Maintenance Due';
            credential.Last_Checked_At__c = System.now();
            if (prior != credential.State__c && credential.Resource__r.Salesforce_User__c != null) {
                Resource360EventService.enqueueNotification(correlation + '-' + credential.Id, credential.Resource__r.Salesforce_User__c, 'Credential ' + credential.State__c, credential.Credential_Name__c + ' requires attention.', credential.State__c == 'Expired' ? 'Critical' : 'High', '/lightning/r/Credential__c/' + credential.Id + '/view');
            }
        }
        if (!credentials.isEmpty()) update credentials;
        return credentials.size();
    }

    @TestVisible
    private static Integer maintainUnbilledEscalations(String correlation){Map<String,List<EscalationTier>>tiersByClass=new Map<String,List<EscalationTier>>{'WAR'=>tiers('Escalation_WAR_Tiers','[{"days":28,"role":"Delivery Head","severity":"High"},{"days":42,"role":"Account Owner","severity":"High"},{"days":56,"role":"Operations","severity":"Critical"}]'),'IFB/PO Awaited'=>tiers('Escalation_IFB_Blocked_Tiers','[{"days":14,"role":"Delivery Head","severity":"High"},{"days":28,"role":"Account Owner","severity":"High"},{"days":42,"role":"Operations","severity":"Critical"}]'),'Blocked'=>tiers('Escalation_IFB_Blocked_Tiers','[{"days":14,"role":"Delivery Head","severity":"High"},{"days":28,"role":"Account Owner","severity":"High"},{"days":42,"role":"Operations","severity":"Critical"}]'),'Shadow Lateral'=>tiers('Escalation_Shadow_Lateral_Tiers','[{"days":28,"role":"Delivery Head","severity":"High"},{"days":42,"role":"Operations","severity":"Critical"}]')};List<EscalationTier>defaultTiers=tiers('Escalation_Default_Tiers','[{"days":30,"role":"Responsible Owner","severity":"High"}]');Set<String>roles=new Set<String>();for(List<EscalationTier>configured:tiersByClass.values())for(EscalationTier tier:configured)if(tier.role!='Responsible Owner')roles.add(tier.role);for(EscalationTier tier:defaultTiers)if(tier.role!='Responsible Owner')roles.add(tier.role);Map<String,Set<Id>>usersByRole=new Map<String,Set<Id>>();Date today=Date.today();if(!roles.isEmpty())for(R360_Role_Scope__c scope:[SELECT User__c,Business_Role__c FROM R360_Role_Scope__c WHERE User__c!=null AND Active__c=true AND Business_Role__c IN:roles AND Valid_From__c<=:today AND(Valid_To__c=null OR Valid_To__c>=:today)]){if(!usersByRole.containsKey(scope.Business_Role__c))usersByRole.put(scope.Business_Role__c,new Set<Id>());usersByRole.get(scope.Business_Role__c).add(scope.User__c);}List<Resource360EventService.NotificationRequest>notifications=new List<Resource360EventService.NotificationRequest>();for(Allocation__c allocation:[SELECT Id,Name,Classification__c,Start_Date__c,End_Date__c,Responsible_Owner__c,Resource__r.Preferred_Name__c,Engagement__r.Name FROM Allocation__c WHERE Current__c=true AND State__c='Accepted' AND Billable_Snapshot__c=false AND Start_Date__c<=:today AND End_Date__c>=:today LIMIT 200]){Integer ageDays=allocation.Start_Date__c.daysBetween(today);List<EscalationTier>configured=tiersByClass.containsKey(allocation.Classification__c)?tiersByClass.get(allocation.Classification__c):defaultTiers;for(EscalationTier tier:configured){if(tier.days==null||tier.days<1||ageDays<tier.days||String.isBlank(tier.role))continue;Set<Id>recipients=tier.role=='Responsible Owner'?new Set<Id>{allocation.Responsible_Owner__c}:usersByRole.get(tier.role);if(recipients==null||recipients.isEmpty())recipients=new Set<Id>{allocation.Responsible_Owner__c};for(Id recipient:recipients)if(recipient!=null){String key='UNBILLED-'+allocation.Id+'-'+tier.days;String title=allocation.Classification__c+' allocation escalation';String message=allocation.Resource__r.Preferred_Name__c+' on '+allocation.Engagement__r.Name+' has remained '+allocation.Classification__c+' for '+ageDays+' days. Configured tier: '+tier.role+' at day '+tier.days+'.';notifications.add(new Resource360EventService.NotificationRequest(key,recipient,title,message,String.isBlank(tier.severity)?'High':tier.severity,'/lightning/r/Allocation__c/'+allocation.Id+'/view'));}}}return Resource360EventService.enqueueNotifications(notifications);}

    @TestVisible
    private static Integer expireOverallocationReviews(String correlation){return Resource360CapacityService.expireReviews(correlation);}

    private static List<EscalationTier>tiers(String policyKey,String fallback){try{List<EscalationTier>result=(List<EscalationTier>)JSON.deserialize(Resource360Policy.jsonValue(policyKey,fallback),List<EscalationTier>.class);return result==null?new List<EscalationTier>():result;}catch(Exception failure){return (List<EscalationTier>)JSON.deserialize(fallback,List<EscalationTier>.class);}}

    @TestVisible
    private static Integer alertOverdueTimesheets(String correlation) {
        List<Timesheet__c> overdue = [
            SELECT Id, Resource__r.Manager__r.Salesforce_User__c, Week_Start__c, Escalated_At__c FROM Timesheet__c
            WHERE Status__c = 'Submitted' AND Decision_Due_At__c != null AND Decision_Due_At__c <= :System.now()
            LIMIT 100
        ];
        for (Timesheet__c timesheet : overdue) {
            Id managerUserId = timesheet.Resource__r.Manager__r.Salesforce_User__c;
            if (managerUserId != null) Resource360EventService.enqueueNotification(correlation + '-' + timesheet.Id, managerUserId, 'Timesheet approval overdue', 'A submitted Resource 360 timesheet is past its approval deadline.', 'High', '/lightning/r/Timesheet__c/' + timesheet.Id + '/view');
            if(timesheet.Escalated_At__c==null)timesheet.Escalated_At__c=System.now();
        }
        if(!overdue.isEmpty())update overdue;
        return overdue.size();
    }

    @TestVisible
    private static Integer autoApproveEligibleTimesheets(String correlation){
        Integer autoDays=Integer.valueOf(Resource360Policy.numberValue('Timesheet_Auto_Approve_Days',7));
        DateTime cutoff=System.now().addDays(-autoDays);
        List<Timesheet__c> candidates=[SELECT Id,Resource__c,Resource__r.Salesforce_User__c,Status__c,Version__c,Submitted_At__c,Escalated_At__c,Dual_Control_Required__c FROM Timesheet__c WHERE Status__c='Submitted' AND Submitted_At__c<=:cutoff LIMIT 100 FOR UPDATE];
        if(candidates.isEmpty())return 0;
        Set<Id>timesheetIds=new Map<Id,Timesheet__c>(candidates).keySet();
        Map<Id,List<Time_Entry__c>>entriesBySheet=new Map<Id,List<Time_Entry__c>>();
        Set<Id>engagementIds=new Set<Id>();
        for(Time_Entry__c entry:[SELECT Id,Timesheet__c,Engagement__c,Work_Date__c,State__c,Allocation__c,Allocation__r.Start_Date__c,Allocation__r.End_Date__c,Allocation__r.State__c FROM Time_Entry__c WHERE Timesheet__c IN:timesheetIds]){if(!entriesBySheet.containsKey(entry.Timesheet__c))entriesBySheet.put(entry.Timesheet__c,new List<Time_Entry__c>());entriesBySheet.get(entry.Timesheet__c).add(entry);if(entry.Engagement__c!=null)engagementIds.add(entry.Engagement__c);}
        Set<Id>financiallyValid=new Set<Id>();for(Budget__c budget:[SELECT Engagement__c FROM Budget__c WHERE Engagement__c IN:engagementIds AND State__c='Approved' AND Current__c=true AND Economic_Signature__c!=null])financiallyValid.add(budget.Engagement__c);
        List<Timesheet__c>updates=new List<Timesheet__c>();List<Time_Entry__c>entryUpdates=new List<Time_Entry__c>();Integer approved=0;
        for(Timesheet__c timesheet:candidates){
            List<String>exceptions=new List<String>();if(timesheet.Dual_Control_Required__c==true)exceptions.add('DUAL_CONTROL_PENDING');List<Time_Entry__c>entries=entriesBySheet.get(timesheet.Id);
            if(entries==null||entries.isEmpty())exceptions.add('NO_TIME_ENTRIES');
            else for(Time_Entry__c entry:entries){if(entry.State__c!='Submitted')exceptions.add('ENTRY_STATE_INVALID');if(entry.Allocation__c==null||entry.Work_Date__c<entry.Allocation__r.Start_Date__c||entry.Work_Date__c>entry.Allocation__r.End_Date__c||!new Set<String>{'Accepted','Superseded','Ended'}.contains(entry.Allocation__r.State__c))exceptions.add('ALLOCATION_EXCEPTION');if(!financiallyValid.contains(entry.Engagement__c))exceptions.add('FINANCIAL_EXCEPTION');}
            if(exceptions.isEmpty()){timesheet.Status__c='Approved';timesheet.Auto_Approved__c=true;timesheet.Decision_At__c=System.now();timesheet.Decision_Note__c='Auto-approved after '+autoDays+' calendar days under Resource 360 policy; no allocation, compliance or financial exception was found.';timesheet.Exception_Code__c=null;for(Time_Entry__c entry:entries){entry.State__c='Approved';entryUpdates.add(entry);}approved++;Resource360AuditService.record(correlation+'-'+timesheet.Id,'Resource 360 System','TIME_AUTO_APPROVED','Timesheet__c',timesheet.Id,timesheet.Version__c,'POLICY_AUTO_APPROVAL',timesheet.Decision_Note__c,Resource360AuditService.state('Submitted',null),Resource360AuditService.state('Approved','Auto-approved'));if(timesheet.Resource__r.Salesforce_User__c!=null)Resource360EventService.enqueueNotification(correlation+'-'+timesheet.Id,timesheet.Resource__r.Salesforce_User__c,'Timesheet auto-approved','Your exception-free timesheet was auto-approved under the active '+autoDays+'-day policy.','Normal','/lightning/r/Timesheet__c/'+timesheet.Id+'/view');}
            else{Set<String>deduplicated=new Set<String>(exceptions);timesheet.Exception_Code__c=String.join(new List<String>(deduplicated),';');timesheet.Escalated_At__c=timesheet.Escalated_At__c==null?System.now():timesheet.Escalated_At__c;}
            updates.add(timesheet);
        }
        if(!entryUpdates.isEmpty())update entryUpdates;if(!updates.isEmpty())update updates;return approved;
    }

    private static String truncate(String value, Integer length) { return value != null && value.length() > length ? value.substring(0, length) : value; }
}
