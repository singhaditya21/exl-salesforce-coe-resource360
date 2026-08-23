public inherited sharing class Resource360TimeService {
    public static Resource360Service.ServiceResult createTimesheet(Id resourceId, Date weekStart) {
        if (resourceId == null || weekStart == null || isoWeekday(weekStart) != 1) fail('Select a resource and a Monday week start.');
        Resource360Security.requireResourceOwnership(resourceId, 'Resource360_Approve_Timesheets', 'You can create only your own timesheet.');
        String key = String.valueOf(resourceId) + '-' + String.valueOf(weekStart) + '-V1';
        List<Timesheet__c> existing = [SELECT Id FROM Timesheet__c WHERE Week_Key__c=:key WITH USER_MODE LIMIT 1];
        String correlation = correlationId();
        if (!existing.isEmpty()) return result(true,'Existing timesheet returned.',existing[0].Id,correlation);
        Resource360CalendarService.Deadline deadline=Resource360CalendarService.deadline(resourceId,weekStart.addDays(6),2,Time.newInstance(18,0,0,0));Timesheet__c timesheet = new Timesheet__c(Resource__c=resourceId,Week_Start__c=weekStart,Week_Key__c=key,Status__c='Draft',Due_At__c=deadline.dueAt,Version__c=1,Current__c=true,Auto_Approved__c=false,Decision_Note__c='Submission deadline: '+deadline.dueDate+' 18:00 '+deadline.timeZoneName);
        timesheet=(Timesheet__c)Resource360Security.createable(new List<SObject>{timesheet})[0];insert timesheet;
        recordEvent(correlation,'TIMESHEET_CREATED',timesheet.Id,1,'WEEK_OPENED','Weekly timesheet created.',null,'Draft');
        return result(true,'Timesheet created.',timesheet.Id,correlation);
    }

    public static Resource360Service.ServiceResult saveEntry(Id timesheetId, Id allocationId, Date workDate, Decimal hours, Id workUnitId, String comment) {
        if (workDate==null||hours==null||hours<=0||hours>24) fail('Provide a work date and valid hours.');
        Timesheet__c timesheet=[SELECT Id,Resource__c,Week_Start__c,Due_At__c,Status__c,Version__c,Current__c FROM Timesheet__c WHERE Id=:timesheetId WITH USER_MODE LIMIT 1 FOR UPDATE];
        Resource360Security.requireResourceOwnership(timesheet.Resource__c,'Resource360_Approve_Timesheets','You can edit only your own timesheet.');
        if(!timesheet.Current__c||(timesheet.Status__c!='Draft'&&timesheet.Status__c!='Rejected'))fail('Only a current draft or rejected timesheet can be edited.');
        enforceDeadline(timesheet,'edit');
        if(workDate<timesheet.Week_Start__c||workDate>timesheet.Week_Start__c.addDays(6))fail('Work date must be inside the timesheet week.');
        Allocation__c allocation=[SELECT Id,Resource__c,Engagement__c,Role__c,Start_Date__c,End_Date__c,State__c,Current__c,Daily_Hours__c FROM Allocation__c WHERE Id=:allocationId WITH USER_MODE LIMIT 1];
        if(allocation.Resource__c!=timesheet.Resource__c||allocation.State__c!='Accepted'||!allocation.Current__c||workDate<allocation.Start_Date__c||workDate>allocation.End_Date__c||hours>allocation.Daily_Hours__c)fail('Time must use the employee’s current accepted allocation and eligible work date.');
        String entryKey=String.valueOf(timesheetId)+'-'+String.valueOf(allocationId)+'-'+String.valueOf(workDate);
        List<Time_Entry__c> existing=[SELECT Id,Version__c FROM Time_Entry__c WHERE Entry_Key__c=:entryKey WITH USER_MODE LIMIT 1];
        Id excludedId=existing.isEmpty()?null:existing[0].Id;
        AggregateResult total=[SELECT SUM(Hours__c) total FROM Time_Entry__c WHERE Timesheet__r.Resource__c=:timesheet.Resource__c AND Timesheet__r.Current__c=true AND Work_Date__c=:workDate AND State__c IN ('Draft','Submitted','Approved') AND Id!=:excludedId];
        Decimal otherHours=(Decimal)total.get('total'); if(otherHours==null)otherHours=0;
        Decimal capacity=Resource360CalendarService.capacityForDate(timesheet.Resource__c,workDate);
        if(capacity<=0)fail('The selected date is non-working under the employee calendar.');
        if(otherHours+hours>capacity)fail('Total time exceeds '+String.valueOf(capacity)+' hours for the employee calendar on '+String.valueOf(workDate)+'.');
        Time_Entry__c entry=existing.isEmpty()?new Time_Entry__c(Entry_Key__c=entryKey,Version__c=1):existing[0];
        entry.Timesheet__c=timesheetId;entry.Allocation__c=allocationId;entry.Engagement__c=allocation.Engagement__c;entry.Work_Unit__c=workUnitId;entry.Work_Date__c=workDate;entry.Hours__c=hours;entry.Role__c=allocation.Role__c;entry.State__c='Draft';entry.Comment__c=comment;if(!existing.isEmpty())entry.Version__c=entry.Version__c+1;
        upsert entry;
        String correlation=correlationId();recordEvent(correlation,'TIME_ENTRY_SAVED',entry.Id,entry.Version__c,'ELIGIBLE_ALLOCATION','Eligible allocation time saved.',null,'Draft');
        return result(true,'Time entry saved.',entry.Id,correlation);
    }

    public static Resource360Service.ServiceResult submit(Id timesheetId) {
        String correlation=correlationId();
        Timesheet__c timesheet=[SELECT Id,Resource__c,Due_At__c,Status__c,Version__c,Current__c FROM Timesheet__c WHERE Id=:timesheetId WITH USER_MODE LIMIT 1 FOR UPDATE];
        Resource360Security.requireResourceOwnership(timesheet.Resource__c,'Resource360_Approve_Timesheets','You can submit only your own timesheet.');
        if(!timesheet.Current__c||(timesheet.Status__c!='Draft'&&timesheet.Status__c!='Rejected'))fail('Only a current draft or rejected timesheet can be submitted.');
        enforceDeadline(timesheet,'submit');
        List<Time_Entry__c> entries=[SELECT Id,State__c FROM Time_Entry__c WHERE Timesheet__c=:timesheetId WITH USER_MODE];if(entries.isEmpty())fail('Add at least one eligible time entry before submission.');
        for(Time_Entry__c entry:entries)entry.State__c='Submitted';update entries;timesheet.Status__c='Submitted';timesheet.Submitted_At__c=System.now();timesheet.Decision_Due_At__c=System.now().addDays(Integer.valueOf(Resource360Policy.numberValue('Timesheet_Decision_Days',5)));timesheet.Escalated_At__c=null;timesheet.Exception_Code__c=null;timesheet.Auto_Approved__c=false;update timesheet;
        recordEvent(correlation,'TIME_SUBMITTED',timesheet.Id,timesheet.Version__c,'EMPLOYEE_SUBMITTED','Weekly time submitted and locked.','Draft','Submitted');
        notifyManager(correlation,timesheet.Resource__c,'Timesheet approval required','A Resource 360 timesheet is ready for approval.',timesheet.Id);
        return result(true,'Timesheet submitted.',timesheet.Id,correlation);
    }

    public static Resource360Service.ServiceResult decide(Id timesheetId, Boolean approve, String note) {
        Resource360Security.requirePermission('Resource360_Approve_Timesheets','Timesheet Approver permission is required to decide submitted time.');
        String correlation=correlationId();
        Timesheet__c timesheet=[SELECT Id,Resource__c,Resource__r.Manager__r.Salesforce_User__c,Resource__r.Org_Unit_ID__c,Status__c,Version__c,Current__c FROM Timesheet__c WHERE Id=:timesheetId WITH USER_MODE LIMIT 1 FOR UPDATE];
        requireManagerScope(timesheet.Resource__c,timesheet.Resource__r.Manager__r.Salesforce_User__c,timesheet.Resource__r.Org_Unit_ID__c);
        if(!timesheet.Current__c||timesheet.Status__c!='Submitted')fail('Only a current submitted timesheet can be decided.');if(!approve&&String.isBlank(note))fail('A rejection reason is required.');
        List<Time_Entry__c> entries=[SELECT Id,State__c FROM Time_Entry__c WHERE Timesheet__c=:timesheetId WITH USER_MODE];for(Time_Entry__c entry:entries)entry.State__c=approve?'Approved':'Rejected';update entries;
        timesheet.Status__c=approve?'Approved':'Rejected';timesheet.Approver__c=UserInfo.getUserId();timesheet.Decision_At__c=System.now();timesheet.Decision_Note__c=note;timesheet.Auto_Approved__c=false;timesheet.Exception_Code__c=null;update timesheet;
        recordEvent(correlation,approve?'TIME_APPROVED':'TIME_REJECTED',timesheet.Id,timesheet.Version__c,approve?'MANAGER_APPROVED':'MANAGER_REJECTED',note,'Submitted',timesheet.Status__c);
        notifyResource(correlation,timesheet.Resource__c,approve?'Timesheet approved':'Timesheet rejected',approve?'Your weekly time was approved.':'Your weekly time was rejected: '+note,timesheet.Id);
        return result(true,approve?'Timesheet approved.':'Timesheet rejected.',timesheet.Id,correlation);
    }

    public static Resource360Service.ServiceResult createCorrection(Id timesheetId,String reason){
        requireText(reason,'A correction reason is required.');String correlation=correlationId();
        Timesheet__c prior=[SELECT Id,Resource__c,Week_Start__c,Status__c,Version__c,Current__c FROM Timesheet__c WHERE Id=:timesheetId WITH USER_MODE LIMIT 1 FOR UPDATE];Resource360Security.requireResourceOwnership(prior.Resource__c,'Resource360_Approve_Timesheets','You cannot correct this timesheet.');if(prior.Status__c!='Approved'||!prior.Current__c)fail('Only the current approved timesheet can start a correction.');
        prior.Current__c=false;update prior;Decimal nextVersion=prior.Version__c+1;Resource360CalendarService.Deadline correctionDeadline=Resource360CalendarService.deadline(prior.Resource__c,Date.today(),2,Time.newInstance(18,0,0,0));Timesheet__c correction=new Timesheet__c(Resource__c=prior.Resource__c,Week_Start__c=prior.Week_Start__c,Week_Key__c=String.valueOf(prior.Resource__c)+'-'+String.valueOf(prior.Week_Start__c)+'-V'+String.valueOf(nextVersion),Status__c='Draft',Due_At__c=correctionDeadline.dueAt,Version__c=nextVersion,Current__c=true,Correction_Parent__c=prior.Id,Decision_Note__c=reason+' · Correction deadline: '+correctionDeadline.dueDate+' 18:00 '+correctionDeadline.timeZoneName);insert correction;
        List<Time_Entry__c> clones=new List<Time_Entry__c>();for(Time_Entry__c entry:[SELECT Id,Allocation__c,Engagement__c,Work_Unit__c,Work_Date__c,Hours__c,Role__c,Comment__c,Version__c FROM Time_Entry__c WHERE Timesheet__c=:prior.Id WITH USER_MODE]){clones.add(new Time_Entry__c(Timesheet__c=correction.Id,Allocation__c=entry.Allocation__c,Engagement__c=entry.Engagement__c,Work_Unit__c=entry.Work_Unit__c,Work_Date__c=entry.Work_Date__c,Hours__c=entry.Hours__c,Role__c=entry.Role__c,State__c='Draft',Comment__c=entry.Comment__c,Version__c=entry.Version__c+1,Correction_Parent__c=entry.Id,Correction_Reason__c=reason,Entry_Key__c=correction.Id+'-'+entry.Allocation__c+'-'+entry.Work_Date__c));}if(!clones.isEmpty())insert clones;
        recordEvent(correlation,'TIME_CORRECTION_CREATED',correction.Id,nextVersion,'CONTROLLED_CORRECTION',reason,'Approved','Draft');return result(true,'Controlled timesheet correction created.',correction.Id,correlation);
    }

    private static void requireManagerScope(Id resourceId,Id managerUserId,String orgUnitId){if(Resource360Security.activeRoles().contains('Administrator'))return;if(managerUserId==UserInfo.getUserId())return;Date today=Date.today();Integer matches=[SELECT COUNT() FROM R360_Role_Scope__c WHERE User__c=:UserInfo.getUserId() AND Active__c=true AND Business_Role__c IN ('Reporting Manager','Timesheet Approver') AND Valid_From__c<=:today AND (Valid_To__c=null OR Valid_To__c>=:today) AND (Org_Unit_ID__c=null OR Org_Unit_ID__c=:orgUnitId)];if(matches==0)fail('The timesheet is outside your manager or delegated approval scope.');}
    private static void enforceDeadline(Timesheet__c timesheet,String action){if(timesheet.Due_At__c==null||System.now()<=timesheet.Due_At__c)return;Resource360Security.requirePermission('Resource360_Override_Time_Deadline','The configured employee-calendar deadline has passed; controlled override permission is required to '+action+'.');}
    private static void notifyManager(String correlation,Id resourceId,String title,String message,Id timesheetId){Resource__c resource=[SELECT Manager__r.Salesforce_User__c FROM Resource__c WHERE Id=:resourceId WITH USER_MODE];if(resource.Manager__r.Salesforce_User__c!=null)Resource360EventService.enqueueNotification(correlation+'-manager',resource.Manager__r.Salesforce_User__c,title,message,'High','/lightning/r/Timesheet__c/'+timesheetId+'/view');}
    private static void notifyResource(String correlation,Id resourceId,String title,String message,Id timesheetId){Resource__c resource=[SELECT Salesforce_User__c FROM Resource__c WHERE Id=:resourceId WITH USER_MODE];if(resource.Salesforce_User__c!=null)Resource360EventService.enqueueNotification(correlation+'-resource',resource.Salesforce_User__c,title,message,'Normal','/lightning/r/Timesheet__c/'+timesheetId+'/view');}
    private static void recordEvent(String correlation,String eventType,Id entityId,Decimal version,String reasonCode,String detail,String beforeState,String afterState){String role=Resource360Security.decisionRole('Resource360_Approve_Timesheets','Reporting Manager');Resource360AuditService.record(correlation,role,eventType,eventType.startsWith('TIME_ENTRY')?'Time_Entry__c':'Timesheet__c',entityId,version,reasonCode,detail,Resource360AuditService.state(beforeState,null),Resource360AuditService.state(afterState,detail));Resource360EventService.enqueue(correlation,eventType,eventType.startsWith('TIME_ENTRY')?'Time_Entry__c':'Timesheet__c',entityId,version,new Map<String,Object>{'state'=>afterState});}
    private static Integer isoWeekday(Date value){return Math.mod(Date.newInstance(1900,1,1).daysBetween(value),7)+1;}
    private static Resource360Service.ServiceResult result(Boolean success,String message,Id recordId,String correlation){return new Resource360Service.ServiceResult(success,message,recordId,correlation);}private static String correlationId(){return EncodingUtil.convertToHex(Crypto.generateAesKey(128));}private static void requireText(String value,String message){if(String.isBlank(value))fail(message);}private static void fail(String message){throw new AuraHandledException(message);}
}
