public with sharing class Resource360Service {
    public class ServiceResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public Id recordId;
        @AuraEnabled public String correlationId;
        public ServiceResult(Boolean success,String message,Id recordId,String correlationId){this.success=success;this.message=message;this.recordId=recordId;this.correlationId=correlationId;}
    }

    @AuraEnabled(cacheable=true)
    public static String getWorkspaceData(){
        Map<String,Object> payload=new Map<String,Object>();
        payload.put('generatedAt',System.now());
        User runningUser=[SELECT Id,Name FROM User WHERE Id=:UserInfo.getUserId() WITH USER_MODE];payload.put('user',runningUser);
        payload.put('activeRoles',new List<String>(Resource360Security.activeRoles()));
        payload.put('classifications',Resource360Classification.activeValues());
        payload.put('metrics',Resource360AnalyticsService.snapshot());
        payload.put('resources',[SELECT Id,Name,Employee_ID__c,Preferred_Name__c,Primary_Role__c,Tower__c,Location__c,Org_Unit_ID__c,Available_Percent__c,Daily_Capacity_Hours__c,Status__c,Source_Last_Sync__c FROM Resource__c WITH USER_MODE ORDER BY Preferred_Name__c LIMIT 100]);
        payload.put('engagements',[SELECT Id,Name,Engagement_ID__c,Status__c,Start_Date__c,End_Date__c,Salesforce_Tower__c,Industry__c,Currency_Code__c,Portfolio_ID__c,Source_Last_Sync__c,Project_Manager__r.Name FROM Engagement__c WITH USER_MODE ORDER BY Name LIMIT 100]);
        payload.put('budgets',[SELECT Id,Name,Engagement__c,Engagement__r.Name,Version__c,Current__c,State__c,Revenue__c,Total_Cost__c,Gross_Margin__c,Margin_Percent__c,Planned_Hours__c,Approval_Level__c,Approval_Step__c,Policy_Version__c FROM Budget__c WHERE Current__c=true WITH USER_MODE ORDER BY LastModifiedDate DESC LIMIT 100]);
        payload.put('staffingRequests',[SELECT Id,Name,Engagement__c,Engagement__r.Name,Resource__c,Resource__r.Preferred_Name__c,Requested_Role__c,Classification__c,Start_Date__c,End_Date__c,Daily_Hours__c,Priority__c,State__c,SLA_Due__c,Fit_Score__c,Decision_Reason__c,Responsible_Owner__c,Review_Date__c FROM Staffing_Request__c WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 100]);
        payload.put('allocations',[SELECT Id,Name,Resource__c,Resource__r.Preferred_Name__c,Engagement__c,Engagement__r.Name,Role__c,Classification__c,Billable__c,Billable_Snapshot__c,Start_Date__c,End_Date__c,Daily_Hours__c,Allocation_Percent__c,State__c,Version__c,Current__c FROM Allocation__c WHERE Current__c=true WITH USER_MODE ORDER BY Start_Date__c LIMIT 100]);
        payload.put('capabilities',[SELECT Id,Name,Capability_ID__c,Type__c,Tower__c,Category__c,Active__c FROM Capability__c WHERE Active__c=true WITH USER_MODE ORDER BY Name LIMIT 200]);
        payload.put('skillClaims',[SELECT Id,Name,Resource__c,Resource__r.Preferred_Name__c,Capability__c,Capability__r.Name,Requested_Level__c,Approved_Level__c,Years_Experience__c,State__c,Submitted_At__c,Decision_Note__c FROM Skill_Claim__c WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 100]);
        payload.put('credentials',[SELECT Id,Name,Resource__c,Resource__r.Preferred_Name__c,Credential_Name__c,Issuer__c,State__c,Issue_Date__c,Expiry_Date__c,Maintenance_Date__c,Verification_Source__c,Verified_At__c,Last_Checked_At__c FROM Credential__c WITH USER_MODE ORDER BY Credential_Name__c LIMIT 100]);
        payload.put('timesheets',[SELECT Id,Name,Resource__c,Resource__r.Preferred_Name__c,Week_Start__c,Due_At__c,Decision_Due_At__c,Escalated_At__c,Status__c,Version__c,Current__c,Submitted_At__c,Decision_At__c,Decision_Note__c,Auto_Approved__c,Exception_Code__c FROM Timesheet__c WHERE Current__c=true WITH USER_MODE ORDER BY Week_Start__c DESC LIMIT 100]);
        payload.put('timeEntries',[SELECT Id,Name,Timesheet__c,Allocation__c,Engagement__r.Name,Work_Date__c,Hours__c,Role__c,State__c,Version__c,Comment__c FROM Time_Entry__c WHERE Timesheet__r.Current__c=true WITH USER_MODE ORDER BY Work_Date__c DESC LIMIT 200]);
        payload.put('notifications',[SELECT Id,Name,Title__c,Message__c,Severity__c,State__c,Read__c,Occurred_At__c,Deep_Link__c FROM R360_Notification__c WHERE Recipient__c=:UserInfo.getUserId() WITH USER_MODE ORDER BY Occurred_At__c DESC LIMIT 100]);
        if(Resource360Security.hasPermission('Resource360_View_Audit'))payload.put('auditEvents',[SELECT Id,Name,Correlation_ID__c,Active_Role__c,Action__c,Entity_Type__c,Entity_ID__c,Reason_Code__c,Detail__c,Payload_Hash__c,Occurred_At__c,Actor__r.Name FROM R360_Audit_Event__c WITH USER_MODE ORDER BY Occurred_At__c DESC LIMIT 100]);else payload.put('auditEvents',new List<R360_Audit_Event__c>());
        if(Resource360Security.hasPermission('Resource360_View_Operations')){
            payload.put('integrationRuns',[SELECT Id,Name,Run_ID__c,Source_System__c,Entity_Type__c,State__c,Started_At__c,Completed_At__c,Source_Cutoff__c,Processed_Count__c,Success_Count__c,Failure_Count__c,Detail__c FROM R360_Integration_Run__c WITH USER_MODE ORDER BY Started_At__c DESC LIMIT 50]);
            payload.put('outboxEvents',[SELECT Id,Name,Event_Type__c,Aggregate_Type__c,Aggregate_ID__c,State__c,Attempt_Count__c,Next_Attempt_At__c,Published_At__c,Last_Error__c FROM R360_Outbox_Event__c WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 50]);
        }else{payload.put('integrationRuns',new List<R360_Integration_Run__c>());payload.put('outboxEvents',new List<R360_Outbox_Event__c>());}
        if(Resource360Security.hasPermission('Resource360_Approve_Budgets'))payload.put('approvalDecisions',[SELECT Id,Name,Entity_Type__c,Entity_ID__c,Entity_Version__c,Step_Number__c,Required_Role__c,State__c,Approver__r.Name,Decided_At__c,Decision_Note__c FROM R360_Approval_Decision__c WITH USER_MODE ORDER BY CreatedDate DESC LIMIT 100]);else payload.put('approvalDecisions',new List<R360_Approval_Decision__c>());
        return JSON.serialize(payload);
    }

    @AuraEnabled public static ServiceResult createStaffingRequest(Id engagementId,Id resourceId,String requestedRole,String classification,Date startDate,Date endDate,Decimal dailyHours,String idempotencyKey){return Resource360StaffingService.create(engagementId,resourceId,requestedRole,classification,startDate,endDate,dailyHours,null,null,null,null,idempotencyKey);}
    @AuraEnabled public static ServiceResult createStaffingRequestV2(Id engagementId,Id resourceId,String requestedRole,String classification,Date startDate,Date endDate,Decimal dailyHours,Id responsibleOwnerId,Date reviewDate,String controlReason,String sourceCriteria,String idempotencyKey){return Resource360StaffingService.create(engagementId,resourceId,requestedRole,classification,startDate,endDate,dailyHours,responsibleOwnerId,reviewDate,controlReason,sourceCriteria,idempotencyKey);}
    @AuraEnabled public static ServiceResult decideStaffingRequest(Id requestId,Boolean accept,String note,String activeRole){return Resource360StaffingService.decide(requestId,accept,note);}
    @AuraEnabled public static ServiceResult modifyAllocation(Id allocationId,Date startDate,Date endDate,Decimal dailyHours,String roleName,String classification,Id responsibleOwnerId,Date reviewDate,String reason){return Resource360StaffingService.modifyAllocation(allocationId,startDate,endDate,dailyHours,roleName,classification,responsibleOwnerId,reviewDate,reason);}
    @AuraEnabled public static ServiceResult deallocate(Id allocationId,Date effectiveEndDate,String reason){return Resource360StaffingService.deallocate(allocationId,effectiveEndDate,reason);}

    @AuraEnabled public static ServiceResult submitBudget(Id budgetId){return Resource360BudgetService.submit(budgetId);}
    @AuraEnabled public static ServiceResult decideBudget(Id budgetId,Boolean approve,String note,String activeRole){return Resource360BudgetService.decide(budgetId,approve,note);}
    @AuraEnabled public static ServiceResult createBudgetVersion(Id sourceBudgetId){return Resource360BudgetService.createVersion(sourceBudgetId);}

    @AuraEnabled public static ServiceResult submitSkillClaim(Id resourceId,Id capabilityId,Integer requestedLevel,Decimal yearsExperience,String evidence,String idempotencyKey){return Resource360SkillService.submitClaim(resourceId,capabilityId,requestedLevel,yearsExperience,evidence,idempotencyKey);}
    @AuraEnabled public static ServiceResult decideSkillClaim(Id claimId,Boolean approve,Integer approvedLevel,String note){return Resource360SkillService.decideClaim(claimId,approve,approvedLevel,note);}
    @AuraEnabled public static ServiceResult addCredential(Id resourceId,String credentialId,String credentialName,String issuer,Date issueDate,Date expiryDate,String evidenceUrl){return Resource360SkillService.addCredential(resourceId,credentialId,credentialName,issuer,issueDate,expiryDate,evidenceUrl);}
    @AuraEnabled public static ServiceResult verifyCredential(Id credentialId,String verificationState,String source,String note){return Resource360SkillService.verifyCredential(credentialId,verificationState,source,note);}

    @AuraEnabled public static ServiceResult createTimesheet(Id resourceId,Date weekStart){return Resource360TimeService.createTimesheet(resourceId,weekStart);}
    @AuraEnabled public static ServiceResult saveTimeEntry(Id timesheetId,Id allocationId,Date workDate,Decimal hours,Id workUnitId,String comment){return Resource360TimeService.saveEntry(timesheetId,allocationId,workDate,hours,workUnitId,comment);}
    @AuraEnabled public static ServiceResult submitTimesheet(Id timesheetId){return Resource360TimeService.submit(timesheetId);}
    @AuraEnabled public static ServiceResult decideTimesheet(Id timesheetId,Boolean approve,String note){return Resource360TimeService.decide(timesheetId,approve,note);}
    @AuraEnabled public static ServiceResult createTimeCorrection(Id timesheetId,String reason){return Resource360TimeService.createCorrection(timesheetId,reason);}
}
