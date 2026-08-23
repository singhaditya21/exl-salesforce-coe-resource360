public inherited sharing class Resource360PlanningService {
    public class PlanningDay {
        @AuraEnabled public Date workDate;
        @AuraEnabled public Boolean workingDay;
        @AuraEnabled public String calendarReason;
        @AuraEnabled public Decimal capacityHours;
        @AuraEnabled public Decimal acceptedHours;
        @AuraEnabled public Decimal pendingHours;
        @AuraEnabled public Decimal requestedHours;
        @AuraEnabled public Decimal remainingHours;
        @AuraEnabled public Boolean conflict;
        @AuraEnabled public String acceptedContext;
        @AuraEnabled public String pendingContext;
    }
    public class PlanningPreview {
        @AuraEnabled public Id resourceId;
        @AuraEnabled public Date startDate;
        @AuraEnabled public Date endDate;
        @AuraEnabled public String mode;
        @AuraEnabled public Decimal requestedDailyHours;
        @AuraEnabled public Decimal requestedTotalHours;
        @AuraEnabled public Decimal allocationPercent;
        @AuraEnabled public Decimal acceptedHours;
        @AuraEnabled public Decimal pendingHours;
        @AuraEnabled public Decimal remainingHours;
        @AuraEnabled public Integer workingDays;
        @AuraEnabled public Integer conflictDays;
        @AuraEnabled public Boolean allowed;
        @AuraEnabled public Boolean pastDateOverride;
        @AuraEnabled public String message;
        @AuraEnabled public List<PlanningDay> days;
    }

    @AuraEnabled(cacheable=true)
    public static PlanningPreview preview(Id resourceId,Date startDate,Date endDate,String mode,Decimal effort,Id excludedAllocationId,Boolean allowPastOverride,String overrideReason){
        if(resourceId==null||startDate==null||endDate==null||endDate<startDate||effort==null||effort<=0)fail('Provide a resource, valid inclusive dates, mode and positive effort.');
        String normalized=String.isBlank(mode)?'Daily Hours':mode.trim();if(!new Set<String>{'Daily Hours','Allocation Percent','Total Hours'}.contains(normalized))fail('Mode must be Daily Hours, Allocation Percent or Total Hours.');
        Boolean past=startDate<Date.today();if(past&&(!allowPastOverride||String.isBlank(overrideReason)))fail('Past-date planning requires an explicit override reason.');if(past)Resource360Security.requirePermission('Resource360_Override_Past_Dates','Past-date planning requires the dedicated override permission.');
        List<Resource360CalendarService.CapacityDay>calendar=Resource360CalendarService.capacityProfile(resourceId,startDate,endDate);Integer working=0;Decimal capacityTotal=0;for(Resource360CalendarService.CapacityDay day:calendar)if(day.workingDay){working++;capacityTotal+=day.capacityHours;}if(working==0)fail('The requested range contains no working days.');
        Decimal uniformHours=normalized=='Daily Hours'?effort:normalized=='Allocation Percent'?null:(effort/working).setScale(2);if(normalized=='Allocation Percent'&&effort>100)fail('Allocation Percent cannot exceed 100.');
        List<Allocation__c>allocations=[SELECT Id,Name,Engagement__r.Name,Role__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Allocation__c WHERE Resource__c=:resourceId AND State__c='Accepted' AND Current__c=true AND Start_Date__c<=:endDate AND End_Date__c>=:startDate WITH USER_MODE];
        List<Staffing_Request__c>pending=[SELECT Id,Name,Engagement__r.Name,Requested_Role__c,Start_Date__c,End_Date__c,Daily_Hours__c FROM Staffing_Request__c WHERE Resource__c=:resourceId AND State__c='Pending' AND Start_Date__c<=:endDate AND End_Date__c>=:startDate WITH USER_MODE];
        PlanningPreview result=new PlanningPreview();result.resourceId=resourceId;result.startDate=startDate;result.endDate=endDate;result.mode=normalized;result.workingDays=working;result.allowed=true;result.pastDateOverride=past;result.days=new List<PlanningDay>();result.requestedTotalHours=0;result.acceptedHours=0;result.pendingHours=0;result.remainingHours=0;result.conflictDays=0;Integer assignedWorkingDays=0;Decimal assignedTotalHours=0;
        for(Resource360CalendarService.CapacityDay calendarDay:calendar){PlanningDay day=new PlanningDay();day.workDate=calendarDay.workDate;day.workingDay=calendarDay.workingDay;day.calendarReason=calendarDay.reason;day.capacityHours=calendarDay.capacityHours;day.acceptedHours=0;day.pendingHours=0;List<String>acceptedLabels=new List<String>();List<String>pendingLabels=new List<String>();for(Allocation__c allocation:allocations)if((excludedAllocationId==null||allocation.Id!=excludedAllocationId)&&allocation.Start_Date__c<=day.workDate&&allocation.End_Date__c>=day.workDate){day.acceptedHours+=allocation.Daily_Hours__c;acceptedLabels.add(allocation.Engagement__r.Name+' · '+allocation.Role__c+' · '+allocation.Daily_Hours__c+'h');}for(Staffing_Request__c request:pending)if(request.Start_Date__c<=day.workDate&&request.End_Date__c>=day.workDate){day.pendingHours+=request.Daily_Hours__c;pendingLabels.add(request.Engagement__r.Name+' · '+request.Requested_Role__c+' · '+request.Daily_Hours__c+'h');}if(!day.workingDay)day.requestedHours=0;else if(normalized=='Allocation Percent')day.requestedHours=(day.capacityHours*effort/100).setScale(2);else if(normalized=='Total Hours'){day.requestedHours=assignedWorkingDays==working-1?effort-assignedTotalHours:uniformHours;assignedWorkingDays++;assignedTotalHours+=day.requestedHours;}else day.requestedHours=uniformHours;day.remainingHours=day.capacityHours-day.acceptedHours-day.requestedHours;day.conflict=day.workingDay&&day.remainingHours<0;day.acceptedContext=String.join(acceptedLabels,'; ');day.pendingContext=String.join(pendingLabels,'; ');result.requestedTotalHours+=day.requestedHours;result.acceptedHours+=day.acceptedHours;result.pendingHours+=day.pendingHours;result.remainingHours+=day.remainingHours>0?day.remainingHours:0;if(day.conflict){result.allowed=false;result.conflictDays++;}result.days.add(day);}
        result.requestedDailyHours=normalized=='Allocation Percent'?(capacityTotal==0?0:(result.requestedTotalHours/working).setScale(2)):uniformHours;result.allocationPercent=capacityTotal==0?0:(result.requestedTotalHours/capacityTotal*100).setScale(2);result.message=result.allowed?'Capacity preview is valid across '+working+' working days.':String.valueOf(result.conflictDays)+' working day(s) exceed accepted capacity.';return result;
    }
    private static void fail(String message){throw new AuraHandledException(message);}
}
