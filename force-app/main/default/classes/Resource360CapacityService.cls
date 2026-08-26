public without sharing class Resource360CapacityService {
    public class DecisionResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Boolean published;
        @AuraEnabled public Boolean requiresApproval;
        @AuraEnabled public String status;
        @AuraEnabled public Decimal projectedDailyHours;
        @AuraEnabled public String message;
        @AuraEnabled public Id allocationId;
        @AuraEnabled public String correlationId;
    }

    private static final String POLICY_VERSION = 'R360-CAPACITY-1.0';
    private static Boolean reconciliationContext=false;
    private static Boolean maintenanceContext=false;
    private static Integer deferredRefreshDepth=0;
    private static Set<Id> deferredResourceIds=new Set<Id>();
    @TestVisible private static Date reviewDateOverride;

    public static Decimal standardHours(){ return Resource360Policy.numberValue('Default_Daily_Capacity',8); }
    public static Decimal lineMaximum(){ return Resource360Policy.numberValue('Allocation_Line_Max_Hours',8); }
    public static Decimal safetyCeiling(){ return Resource360Policy.numberValue('Allocation_Overage_Ceiling_Hours',12); }
    public static Boolean isReconciliationContext(){return reconciliationContext;}

    public static void stampSeededPublished(Allocation__c allocation,String reason){
        allocation.Planning_Status__c='Published';allocation.Published_By__c=UserInfo.getUserId();allocation.Published_At__c=System.now();allocation.Capacity_Policy_Version__c=POLICY_VERSION;
        if(allocation.State__c=='Accepted'&&allocation.Current__c==true){allocation.Overallocation_Status__c='Approved';allocation.Overallocation_Reason__c=String.isBlank(reason)?'Sanitized governed demo capacity exception.':reason;allocation.Overallocation_Approved_By__c=UserInfo.getUserId();allocation.Overallocation_Approved_At__c=System.now();allocation.Overallocation_Expiry_Date__c=Date.today().addDays(Integer.valueOf(Resource360Policy.numberValue('Allocation_Overage_Review_Days',30)));}
    }

    public static void validateBefore(List<Allocation__c> proposed, Map<Id,Allocation__c> priorById){
        if(proposed==null||proposed.isEmpty())return;
        if(maintenanceContext)return;
        Set<Id>candidateIds=new Set<Id>();Set<Id>resourceIds=new Set<Id>();Date minimumDate;Date maximumDate;
        List<Allocation__c>committing=new List<Allocation__c>();
        for(Allocation__c allocation:proposed){
            if(allocation.Daily_Hours__c==null||allocation.Daily_Hours__c<=0||allocation.Daily_Hours__c>lineMaximum()){
                allocation.addError('One project-allocation line must be greater than zero and cannot exceed '+lineMaximum()+' hours per day.');continue;
            }
            if(allocation.Id!=null)candidateIds.add(allocation.Id);
            if(allocation.Resource__c==null||allocation.Start_Date__c==null||allocation.End_Date__c==null||allocation.End_Date__c<allocation.Start_Date__c)continue;
            if(allocation.State__c=='Accepted'&&allocation.Current__c==true&&(String.isBlank(allocation.Planning_Status__c)||allocation.Planning_Status__c=='Published')){
                committing.add(allocation);resourceIds.add(allocation.Resource__c);
                minimumDate=minimumDate==null||allocation.Start_Date__c<minimumDate?allocation.Start_Date__c:minimumDate;
                maximumDate=maximumDate==null||allocation.End_Date__c>maximumDate?allocation.End_Date__c:maximumDate;
            }
        }
        if(committing.isEmpty())return;

        Map<Id,Resource__c>resources=new Map<Id,Resource__c>([
            SELECT Id,Employee_ID__c,Status__c,Employment_Start__c,Employment_End__c,Daily_Capacity_Hours__c,
                Work_Calendar__c,Work_Calendar__r.Work_Days__c,Work_Calendar__r.Daily_Capacity_Hours__c,
                Work_Calendar__r.Effective_From__c,Work_Calendar__r.Effective_To__c,Work_Calendar__r.Current__c
            FROM Resource__c WHERE Id IN:resourceIds FOR UPDATE
        ]);
        Map<Id,List<Allocation__c>>allByResource=new Map<Id,List<Allocation__c>>();
        for(Id resourceId:resourceIds)allByResource.put(resourceId,new List<Allocation__c>());
        for(Allocation__c existing:[
            SELECT Id,Resource__c,Start_Date__c,End_Date__c,Daily_Hours__c,Overallocation_Status__c,
                Overallocation_Approved_By__c,Overallocation_Approved_At__c,Overallocation_Expiry_Date__c
            FROM Allocation__c WHERE Resource__c IN:resourceIds AND State__c='Accepted' AND Current__c=true
                AND Start_Date__c<=:maximumDate AND End_Date__c>=:minimumDate
        ])if(!candidateIds.contains(existing.Id))allByResource.get(existing.Resource__c).add(existing);
        for(Allocation__c allocation:committing)allByResource.get(allocation.Resource__c).add(allocation);

        Set<Id>calendarIds=new Set<Id>();for(Resource__c resource:resources.values())if(resource.Work_Calendar__c!=null)calendarIds.add(resource.Work_Calendar__c);
        Map<Id,Map<Date,Decimal>>exceptionsByCalendar=new Map<Id,Map<Date,Decimal>>();
        if(!calendarIds.isEmpty())for(R360_Calendar_Exception__c exceptionRecord:[SELECT Calendar__c,Exception_Date__c,Capacity_Hours__c FROM R360_Calendar_Exception__c WHERE Calendar__c IN:calendarIds AND Exception_Date__c>=:minimumDate AND Exception_Date__c<=:maximumDate]){
            if(!exceptionsByCalendar.containsKey(exceptionRecord.Calendar__c))exceptionsByCalendar.put(exceptionRecord.Calendar__c,new Map<Date,Decimal>());
            exceptionsByCalendar.get(exceptionRecord.Calendar__c).put(exceptionRecord.Exception_Date__c,exceptionRecord.Capacity_Hours__c);
        }
        for(Allocation__c candidate:committing){
            Resource__c resource=resources.get(candidate.Resource__c);if(resource==null){candidate.addError('The allocation resource is unavailable.');continue;}
            if(resource.Status__c!='Active'||(resource.Employment_Start__c!=null&&candidate.Start_Date__c<resource.Employment_Start__c)||(resource.Employment_End__c!=null&&candidate.End_Date__c>resource.Employment_End__c)){candidate.addError('The resource must remain active for the complete allocation range.');continue;}
            Integer rangeDays=candidate.Start_Date__c.daysBetween(candidate.End_Date__c)+1;if(rangeDays>Integer.valueOf(Resource360Policy.numberValue('Capacity_Max_Range_Days',1100))){candidate.addError('The allocation range exceeds the configured capacity-validation limit.');continue;}
            Decimal peak=0;Date peakDate;Integer workingDays=0;
            for(Integer offset=0;offset<rangeDays;offset++){
                Date workDate=candidate.Start_Date__c.addDays(offset);if(capacityFor(resource,workDate,exceptionsByCalendar)<=0)continue;workingDays++;
                Decimal total=0;for(Allocation__c allocation:allByResource.get(candidate.Resource__c))if(allocation.Start_Date__c<=workDate&&allocation.End_Date__c>=workDate)total+=allocation.Daily_Hours__c;
                if(total>peak){peak=total;peakDate=workDate;}
            }
            if(workingDays==0){candidate.addError('The allocation range contains no working days under the resource calendar.');continue;}
            candidate.Projected_Daily_Hours__c=peak;candidate.Capacity_Policy_Version__c=POLICY_VERSION;
            if(peak>safetyCeiling()){
                candidate.addError('Aggregate allocation reaches '+peak+' hours on '+peakDate+', above the configured '+safetyCeiling()+'-hour safety ceiling.');continue;
            }
            if(peak>standardHours()){
                candidate.Overallocated__c=true;candidate.Capacity_Status__c='Overallocated';
                if(!hasApproval(candidate))candidate.addError('Aggregate allocation above '+standardHours()+' hours requires an approved over-allocation reason, independent approver, approval timestamp and current review expiry.');
            }else{
                candidate.Overallocated__c=false;candidate.Capacity_Status__c=peak==standardHours()?'Fully Allocated':'Underallocated';candidate.Overallocation_Status__c='Not Required';
                candidate.Overallocation_Reason__c=null;candidate.Overallocation_Approved_By__c=null;candidate.Overallocation_Approved_At__c=null;candidate.Overallocation_Expiry_Date__c=null;
            }
        }
    }

    @AuraEnabled
    public static DecisionResult publishDraft(Id allocationId,String reason){
        Resource360Security.requirePermission('Resource360_Manage_Staffing','COE Staffer permission is required to publish allocation plans.');
        Allocation__c allocation=[SELECT Id,Parent_Allocation__c,Originating_Request__c,Resource__c,Start_Date__c,End_Date__c,Daily_Hours__c,State__c,Planning_Status__c,Version__c FROM Allocation__c WHERE Id=:allocationId LIMIT 1 FOR UPDATE];
        if(allocation.State__c!='Draft'||!new Set<String>{'Draft','Pending Approval'}.contains(allocation.Planning_Status__c))fail('Only a current allocation draft can be published.');
        Resource360CalendarService.CapacityCheck check=Resource360CalendarService.checkCapacity(allocation.Resource__c,allocation.Start_Date__c,allocation.End_Date__c,allocation.Daily_Hours__c,allocation.Parent_Allocation__c);
        if(!check.allowed)fail(check.message);
        String correlation=correlationId();DecisionResult result=new DecisionResult();result.success=true;result.allocationId=allocation.Id;result.correlationId=correlation;result.projectedDailyHours=check.peakHours;
        if(check.requiresApproval){
            if(String.isBlank(reason))fail('A business reason is required before requesting over-allocation approval.');
            allocation.Planning_Status__c='Pending Approval';allocation.Overallocation_Status__c='Pending Approval';allocation.Overallocation_Reason__c=reason.trim();allocation.Overallocated__c=true;allocation.Capacity_Status__c='Overallocated';allocation.Projected_Daily_Hours__c=check.peakHours;allocation.Capacity_Policy_Version__c=POLICY_VERSION;update allocation;
            if(allocation.Originating_Request__c!=null)update new Staffing_Request__c(Id=allocation.Originating_Request__c,State__c='Capacity Approval',Decision_Reason__c='Independent over-allocation approval required.');
            audit(correlation,'OVERALLOCATION_SUBMITTED',allocation,'PENDING_INDEPENDENT_APPROVAL',reason,'Draft','Pending Approval');
            result.published=false;result.requiresApproval=true;result.status='Pending Approval';result.message='The plan is within the twelve-hour safety ceiling and awaits independent approval.';return result;
        }
        supersedeParent(allocation.Parent_Allocation__c);allocation.State__c='Accepted';allocation.Planning_Status__c='Published';allocation.Capacity_Status__c=check.peakHours==standardHours()?'Fully Allocated':'Underallocated';allocation.Overallocated__c=false;allocation.Overallocation_Status__c='Not Required';allocation.Projected_Daily_Hours__c=check.peakHours;allocation.Published_By__c=UserInfo.getUserId();allocation.Published_At__c=System.now();allocation.Capacity_Policy_Version__c=POLICY_VERSION;update allocation;
        if(allocation.Originating_Request__c!=null)update new Staffing_Request__c(Id=allocation.Originating_Request__c,State__c='Accepted',Decision_Reason__c='Capacity plan published.');
        audit(correlation,'ALLOCATION_PUBLISHED',allocation,'WITHIN_STANDARD_CAPACITY',reason,'Draft','Published');result.published=true;result.requiresApproval=false;result.status=allocation.Capacity_Status__c;result.message='Allocation plan published within standard capacity.';return result;
    }

    @AuraEnabled
    public static DecisionResult decideOverallocation(Id allocationId,Boolean approve,String note){
        Resource360Security.requirePermission('Resource360_Approve_Overallocation','Head of Delivery over-allocation approval permission is required.');if(String.isBlank(note))fail('An approval or rejection note is required.');
        Allocation__c allocation=[SELECT Id,Parent_Allocation__c,Originating_Request__c,Resource__c,Start_Date__c,End_Date__c,Daily_Hours__c,State__c,Planning_Status__c,Overallocation_Status__c,Version__c FROM Allocation__c WHERE Id=:allocationId LIMIT 1 FOR UPDATE];
        if(allocation.State__c!='Draft'||allocation.Planning_Status__c!='Pending Approval'||allocation.Overallocation_Status__c!='Pending Approval')fail('Only a pending over-allocation plan can be decided.');
        String correlation=correlationId();DecisionResult result=new DecisionResult();result.success=true;result.allocationId=allocation.Id;result.correlationId=correlation;
        if(!approve){allocation.State__c='Cancelled';allocation.Planning_Status__c='Rejected';allocation.Overallocation_Status__c='Rejected';allocation.Overallocation_Reason__c=note.trim();update allocation;if(allocation.Originating_Request__c!=null)update new Staffing_Request__c(Id=allocation.Originating_Request__c,State__c='Declined',Decision_Reason__c=note.trim());audit(correlation,'OVERALLOCATION_REJECTED',allocation,'INDEPENDENT_REJECTION',note,'Pending Approval','Rejected');result.published=false;result.requiresApproval=false;result.status='Rejected';result.message='Over-allocation plan rejected without consuming capacity.';return result;}
        Resource360CalendarService.CapacityCheck check=Resource360CalendarService.checkCapacity(allocation.Resource__c,allocation.Start_Date__c,allocation.End_Date__c,allocation.Daily_Hours__c,allocation.Parent_Allocation__c);if(!check.allowed)fail(check.message);if(!check.requiresApproval)fail('The current plan no longer exceeds standard capacity; return it to the Staffer for ordinary publication.');
        Date expiry=Date.today().addDays(Integer.valueOf(Resource360Policy.numberValue('Allocation_Overage_Review_Days',30)));
        supersedeParent(allocation.Parent_Allocation__c);allocation.State__c='Accepted';allocation.Planning_Status__c='Published';allocation.Overallocation_Status__c='Approved';allocation.Overallocation_Reason__c=note.trim();allocation.Overallocation_Approved_By__c=UserInfo.getUserId();allocation.Overallocation_Approved_At__c=System.now();allocation.Overallocation_Expiry_Date__c=expiry;allocation.Overallocated__c=true;allocation.Capacity_Status__c='Overallocated';allocation.Projected_Daily_Hours__c=check.peakHours;allocation.Published_By__c=UserInfo.getUserId();allocation.Published_At__c=System.now();allocation.Capacity_Policy_Version__c=POLICY_VERSION;update allocation;
        if(allocation.Originating_Request__c!=null)update new Staffing_Request__c(Id=allocation.Originating_Request__c,State__c='Accepted',Decision_Reason__c='Independent over-allocation approval recorded: '+note.trim());
        audit(correlation,'OVERALLOCATION_APPROVED',allocation,'INDEPENDENT_APPROVAL',note,'Pending Approval','Published');result.published=true;result.requiresApproval=false;result.status='Overallocated';result.projectedDailyHours=check.peakHours;result.message='Controlled over-allocation published through '+expiry+'.';return result;
    }

    public static void beginDeferredRefresh(){deferredRefreshDepth++;}
    public static void cancelDeferredRefresh(){deferredRefreshDepth=0;deferredResourceIds.clear();}
    public static void completeDeferredRefresh(){if(deferredRefreshDepth>0)deferredRefreshDepth--;if(deferredRefreshDepth>0)return;Set<Id>resourceIds=new Set<Id>(deferredResourceIds);deferredResourceIds.clear();if(!resourceIds.isEmpty())refresh(Date.today(),resourceIds);}
    public static void refreshToday(Set<Id>requestedResourceIds){if(deferredRefreshDepth>0){if(requestedResourceIds!=null)deferredResourceIds.addAll(requestedResourceIds);return;}refresh(Date.today(),requestedResourceIds);}

    public static Integer expireReviews(String correlation){
        Date reviewDate=reviewDateOverride==null?Date.today():reviewDateOverride;
        List<Allocation__c> expired=[SELECT Id,Version__c,Resource__c,Overallocation_Approved_By__c,Overallocation_Expiry_Date__c,Overallocation_Status__c,Planning_Status__c FROM Allocation__c WHERE State__c='Accepted' AND Current__c=true AND Overallocation_Status__c='Approved' AND Overallocation_Expiry_Date__c<:reviewDate LIMIT 200 FOR UPDATE];
        for(Allocation__c allocation:expired){allocation.Overallocation_Status__c='Expired';allocation.Planning_Status__c='Expired';}
        if(!expired.isEmpty())try{maintenanceContext=true;update expired;}finally{maintenanceContext=false;}
        for(Allocation__c allocation:expired){String detail='Controlled over-allocation review expired on '+allocation.Overallocation_Expiry_Date__c+'; the capacity remains visible as an unapproved exception until renewed or reduced.';Resource360AuditService.record(correlation+'-'+allocation.Id,'Resource 360 System','OVERALLOCATION_REVIEW_EXPIRED','Allocation__c',allocation.Id,allocation.Version__c,'REVIEW_WINDOW_EXPIRED',detail,Resource360AuditService.state('Approved',null),Resource360AuditService.state('Expired',detail));if(allocation.Overallocation_Approved_By__c!=null)Resource360EventService.enqueueNotification(correlation+'-'+allocation.Id,allocation.Overallocation_Approved_By__c,'Capacity exception review expired',detail,'Critical','/lightning/r/Allocation__c/'+allocation.Id+'/view');}
        return expired.size();
    }

    public static void refresh(Date workDate,Set<Id>requestedResourceIds){
        if(workDate==null)workDate=Date.today();
        List<Resource__c>resources=requestedResourceIds==null||requestedResourceIds.isEmpty()
            ?[SELECT Id,Employee_ID__c,Daily_Capacity_Hours__c,Available_Percent__c,Allocated_Daily_Hours__c,Capacity_Status__c,Capacity_As_Of__c,Overallocated__c FROM Resource__c WHERE Status__c='Active' LIMIT 9000]
            :[SELECT Id,Employee_ID__c,Daily_Capacity_Hours__c,Available_Percent__c,Allocated_Daily_Hours__c,Capacity_Status__c,Capacity_As_Of__c,Overallocated__c FROM Resource__c WHERE Id IN:requestedResourceIds LIMIT 9000];
        if(resources.isEmpty())return;Set<Id>resourceIds=new Map<Id,Resource__c>(resources).keySet();
        Map<Id,Decimal>hoursByResource=new Map<Id,Decimal>();Map<Id,Integer>countByResource=new Map<Id,Integer>();Map<Id,Boolean>approvedByResource=new Map<Id,Boolean>();Map<Id,Integer>pendingByResource=new Map<Id,Integer>();Map<Id,Decimal>hoursByMembership=new Map<Id,Decimal>();
        for(Allocation__c allocation:[SELECT Resource__c,Delivery_Membership__c,Daily_Hours__c,Overallocation_Status__c,Overallocation_Expiry_Date__c FROM Allocation__c WHERE Resource__c IN:resourceIds AND State__c='Accepted' AND Current__c=true AND Start_Date__c<=:workDate AND End_Date__c>=:workDate]){
            hoursByResource.put(allocation.Resource__c,(hoursByResource.containsKey(allocation.Resource__c)?hoursByResource.get(allocation.Resource__c):0)+allocation.Daily_Hours__c);countByResource.put(allocation.Resource__c,(countByResource.containsKey(allocation.Resource__c)?countByResource.get(allocation.Resource__c):0)+1);
            if(allocation.Overallocation_Status__c=='Approved'&&(allocation.Overallocation_Expiry_Date__c==null||allocation.Overallocation_Expiry_Date__c>=workDate))approvedByResource.put(allocation.Resource__c,true);
            if(allocation.Delivery_Membership__c!=null)hoursByMembership.put(allocation.Delivery_Membership__c,(hoursByMembership.containsKey(allocation.Delivery_Membership__c)?hoursByMembership.get(allocation.Delivery_Membership__c):0)+allocation.Daily_Hours__c);
        }
        for(Allocation__c allocation:[SELECT Resource__c FROM Allocation__c WHERE Resource__c IN:resourceIds AND State__c='Draft' AND Current__c=true AND Planning_Status__c='Pending Approval' AND Start_Date__c<=:workDate AND End_Date__c>=:workDate])pendingByResource.put(allocation.Resource__c,(pendingByResource.containsKey(allocation.Resource__c)?pendingByResource.get(allocation.Resource__c):0)+1);
        Map<Id,R360_Daily_Capacity__c>existingLedgerByResource=new Map<Id,R360_Daily_Capacity__c>();for(R360_Daily_Capacity__c existing:[SELECT Id,Resource__c FROM R360_Daily_Capacity__c WHERE Resource__c IN:resourceIds])existingLedgerByResource.put(existing.Resource__c,existing);
        List<R360_Daily_Capacity__c>ledger=new List<R360_Daily_Capacity__c>();Decimal standard=standardHours();
        for(Resource__c resource:resources){Decimal hours=hoursByResource.containsKey(resource.Id)?hoursByResource.get(resource.Id):0;String status=status(hours,standard);Decimal available=standard==0?0:Math.max(0,(standard-hours)/standard*100).setScale(2);resource.Allocated_Daily_Hours__c=hours;resource.Available_Percent__c=available;resource.Capacity_Status__c=status;resource.Capacity_As_Of__c=workDate;resource.Overallocated__c=hours>standard;R360_Daily_Capacity__c row=existingLedgerByResource.containsKey(resource.Id)?new R360_Daily_Capacity__c(Id=existingLedgerByResource.get(resource.Id).Id):new R360_Daily_Capacity__c(Ledger_Key__c=resource.Employee_ID__c,Resource__c=resource.Id);
            row.Work_Date__c=workDate;row.Standard_Hours__c=standard;row.Allocated_Hours__c=hours;row.Capacity_Status__c=status;row.Allocation_Count__c=countByResource.containsKey(resource.Id)?countByResource.get(resource.Id):0;row.Approved_Overallocated__c=hours>standard&&approvedByResource.get(resource.Id)==true;row.Pending_Approval_Count__c=pendingByResource.containsKey(resource.Id)?pendingByResource.get(resource.Id):0;row.Reconciled_At__c=System.now();ledger.add(row);
        }
        try{reconciliationContext=true;Database.upsert(ledger,true,AccessLevel.SYSTEM_MODE);}finally{reconciliationContext=false;}Database.update(resources,true,AccessLevel.SYSTEM_MODE);
        List<R360_Delivery_Membership__c>memberships=[SELECT Id,Capacity_Percent__c,Allocated_Daily_Hours__c,Available_Percent__c,Capacity_Status__c,Capacity_As_Of__c FROM R360_Delivery_Membership__c WHERE Resource__c IN:resourceIds AND Current__c=true];
        for(R360_Delivery_Membership__c membership:memberships){Decimal authorized=standard*(membership.Capacity_Percent__c==null?100:membership.Capacity_Percent__c)/100;Decimal allocated=hoursByMembership.containsKey(membership.Id)?hoursByMembership.get(membership.Id):0;membership.Allocated_Daily_Hours__c=allocated;membership.Available_Percent__c=authorized==0?0:Math.max(0,(authorized-allocated)/authorized*100).setScale(2);membership.Capacity_Status__c=status(allocated,authorized);membership.Capacity_As_Of__c=workDate;}if(!memberships.isEmpty())Database.update(memberships,true,AccessLevel.SYSTEM_MODE);
    }

    private static String status(Decimal hours,Decimal standard){if(hours==null||hours==0)return'Bench';if(hours<standard)return'Underallocated';if(hours==standard)return'Fully Allocated';return'Overallocated';}
    private static void supersedeParent(Id parentId){if(parentId==null)return;List<Allocation__c>parents=[SELECT Id,State__c,Current__c FROM Allocation__c WHERE Id=:parentId LIMIT 1 FOR UPDATE];if(!parents.isEmpty()&&parents[0].Current__c){parents[0].Current__c=false;parents[0].State__c='Superseded';update parents;}}
    private static Boolean hasApproval(Allocation__c allocation){return allocation.Overallocation_Status__c=='Approved'&&String.isNotBlank(allocation.Overallocation_Reason__c)&&allocation.Overallocation_Approved_By__c!=null&&allocation.Overallocation_Approved_At__c!=null&&allocation.Overallocation_Expiry_Date__c!=null&&allocation.Overallocation_Expiry_Date__c>=Date.today();}
    private static Decimal capacityFor(Resource__c resource,Date workDate,Map<Id,Map<Date,Decimal>>exceptionsByCalendar){if(resource.Work_Calendar__c!=null&&exceptionsByCalendar.containsKey(resource.Work_Calendar__c)&&exceptionsByCalendar.get(resource.Work_Calendar__c).containsKey(workDate))return exceptionsByCalendar.get(resource.Work_Calendar__c).get(workDate);if(resource.Work_Calendar__c!=null&&resource.Work_Calendar__r.Current__c&&workDate>=resource.Work_Calendar__r.Effective_From__c&&(resource.Work_Calendar__r.Effective_To__c==null||workDate<=resource.Work_Calendar__r.Effective_To__c)){Integer weekday=isoWeekday(workDate);return new Set<String>(resource.Work_Calendar__r.Work_Days__c.split(',')).contains(String.valueOf(weekday))?standardHours():0;}return isoWeekday(workDate)>5?0:standardHours();}
    private static Integer isoWeekday(Date value){return Math.mod(Date.newInstance(1900,1,1).daysBetween(value),7)+1;}
    private static String correlationId(){return EncodingUtil.convertToHex(Crypto.generateAesKey(128));}
    private static void audit(String correlation,String action,Allocation__c allocation,String reasonCode,String note,String beforeState,String afterState){Resource360AuditService.record(correlation,Resource360Security.decisionRole('Resource360_Approve_Overallocation','Capacity Controller'),action,'Allocation__c',allocation.Id,allocation.Version__c,reasonCode,note,Resource360AuditService.state(beforeState,null),Resource360AuditService.state(afterState,note));Resource360EventService.enqueue(correlation,action,'Allocation__c',allocation.Id,allocation.Version__c,new Map<String,Object>{'state'=>afterState,'projectedDailyHours'=>allocation.Projected_Daily_Hours__c});}
    private static void fail(String message){throw new AuraHandledException(message);}
}
