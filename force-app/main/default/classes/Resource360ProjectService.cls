public inherited sharing class Resource360ProjectService {
    public class GateSnapshot {
        @AuraEnabled public Boolean ready;
        @AuraEnabled public Integer incompleteWorkUnits;
        @AuraEnabled public Integer pendingAcceptances;
        @AuraEnabled public Integer openHighRisks;
        @AuraEnabled public Integer unreconciledTimeEntries;
        @AuraEnabled public Boolean commercialApproved;
        @AuraEnabled public Boolean budgetApproved;
        @AuraEnabled public Decimal actualHours;
        @AuraEnabled public Decimal finalEac;
        @AuraEnabled public List<String> blockers;
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult createProject(
        String projectCode, String projectName, Id portfolioId, String industry, String tower,
        Date startDate, Date endDate, String revenueType, String currencyCode,
        String contractExternalId, Decimal contractValue, String intakeCorrelationId
    ) {
        Resource360Security.requirePermission('Resource360_Manage_Projects', 'Project Manager permission is required to create a project.');
        requireText(projectCode, 'Project code is required.'); requireText(projectName, 'Project name is required.');
        requireDates(startDate, endDate); requireText(contractExternalId, 'An initial SOW identifier is required.');
        if (contractValue == null || contractValue <= 0) fail('The initial SOW value must be greater than zero.');
        if (portfolioId == null) fail('An authorized portfolio is required.');
        List<Engagement__c> existing = [SELECT Id FROM Engagement__c WHERE Engagement_ID__c=:projectCode.trim() WITH USER_MODE LIMIT 1];
        if (!existing.isEmpty()) return result(true, 'The governed project already exists.', existing[0].Id, intakeCorrelationId);
        R360_Portfolio__c portfolio = [SELECT Id, Portfolio_ID__c, Account__c FROM R360_Portfolio__c WHERE Id=:portfolioId WITH USER_MODE LIMIT 1];
        List<R360_Sub_Portfolio__c> subPortfolios=[SELECT Id FROM R360_Sub_Portfolio__c WHERE Portfolio__c=:portfolio.Id AND Current__c=true WITH USER_MODE ORDER BY Sub_Portfolio_ID__c LIMIT 1];
        String correlation = String.isBlank(intakeCorrelationId) ? correlationId() : intakeCorrelationId.trim();
        Engagement__c engagement = new Engagement__c(
            Name=projectName.trim(), Engagement_ID__c=projectCode.trim(), Account__c=portfolio.Account__c,
            Portfolio__c=portfolio.Id, Portfolio_ID__c=portfolio.Portfolio_ID__c, Sub_Portfolio__c=subPortfolios.isEmpty()?null:subPortfolios[0].Id, Project_Manager__c=UserInfo.getUserId(),
            Start_Date__c=startDate, End_Date__c=endDate, Status__c='Planned', Lifecycle_Stage__c='Contracted',
            Completion_Percent__c=0, Revenue_Type__c=String.isBlank(revenueType)?'Time and Materials':revenueType,
            Currency_Code__c=String.isBlank(currencyCode)?'INR':currencyCode.trim(), PO_Value__c=contractValue,
            Salesforce_Tower__c=tower, Industry__c=industry, Confidentiality__c='EXL Internal',
            Intake_Source__c='Resource 360 governed intake', Intake_Correlation_ID__c=correlation,
            Source_Last_Sync__c=System.now()
        );
        engagement=(Engagement__c)Resource360Security.createable(new List<SObject>{engagement})[0]; insert engagement;
        Commercial_Reference__c sow = new Commercial_Reference__c(
            Engagement__c=engagement.Id, External_ID__c=contractExternalId.trim(), Reference_Type__c='SOW',
            Change_Type__c='Initial', Version__c=1, Approval_Status__c='Approved', Signed_Date__c=Date.today(),
            Value__c=contractValue, Valid_From__c=startDate, Valid_To__c=endDate, Status__c='Active',
            Signature__c=hash(contractExternalId+'|'+contractValue+'|'+startDate+'|'+endDate), Source_Last_Sync__c=System.now()
        );
        sow=(Commercial_Reference__c)Resource360Security.createable(new List<SObject>{sow})[0]; insert sow;
        Commercial_Line__c line = new Commercial_Line__c(
            Commercial_Reference__c=sow.Id, External_ID__c=contractExternalId.trim()+'-CORE', Line_Type__c='Service',
            Description__c='Core Salesforce COE delivery services.', Sequence__c=1, Value__c=contractValue,
            Planned_Delivery_Date__c=endDate, Status__c='Active', Acceptance_Required__c=false, Acceptance_Status__c='Not Required'
        );
        line=(Commercial_Line__c)Resource360Security.createable(new List<SObject>{line})[0]; insert line;
        audit(correlation,'PROJECT_CREATED','Engagement__c',engagement.Id,1,'GOVERNED_INTAKE','Project and approved initial SOW created atomically.',null,'Contracted');
        Resource360EventService.enqueue(correlation,'PROJECT_CREATED','Engagement__c',engagement.Id,1,new Map<String,Object>{'projectCode'=>projectCode,'stage'=>'Contracted'});
        return result(true, 'Project intake and initial SOW created.', engagement.Id, correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult createCommercialChange(
        Id engagementId, Id parentReferenceId, String externalId, String referenceType,
        Decimal value, Date validFrom, Date validTo, String changeReason
    ) {
        Resource360Security.requirePermission('Resource360_Manage_Projects', 'Project Manager permission is required to manage commercial changes.');
        requireText(externalId,'Commercial change identifier is required.'); requireText(changeReason,'A commercial change reason is required.'); requireDates(validFrom,validTo);
        if (!new Set<String>{'Amendment','Change Order'}.contains(referenceType)) fail('Commercial change type must be Amendment or Change Order.');
        if (value == null || value <= 0) fail('Commercial change value must be greater than zero.');
        Engagement__c engagement=[SELECT Id,Start_Date__c,End_Date__c FROM Engagement__c WHERE Id=:engagementId WITH USER_MODE LIMIT 1];
        Commercial_Reference__c parent=[SELECT Id,Engagement__c,Version__c FROM Commercial_Reference__c WHERE Id=:parentReferenceId AND Engagement__c=:engagement.Id WITH USER_MODE LIMIT 1];
        Commercial_Reference__c change=new Commercial_Reference__c(
            Engagement__c=engagement.Id,Parent_Reference__c=parent.Id,External_ID__c=externalId.trim(),Reference_Type__c=referenceType,
            Change_Type__c=referenceType,Version__c=(parent.Version__c==null?1:parent.Version__c)+1,Approval_Status__c='Approved',Signed_Date__c=Date.today(),
            Value__c=value,Valid_From__c=validFrom,Valid_To__c=validTo,Status__c='Active',Change_Reason__c=changeReason.trim(),
            Signature__c=hash(externalId+'|'+value+'|'+validFrom+'|'+validTo+'|'+changeReason),Source_Last_Sync__c=System.now()
        );
        change=(Commercial_Reference__c)Resource360Security.createable(new List<SObject>{change})[0];insert change;
        String correlation=correlationId();audit(correlation,'COMMERCIAL_CHANGE_CREATED','Commercial_Reference__c',change.Id,change.Version__c,'APPROVED_CHANGE',changeReason,null,'Active');
        return result(true,'Approved commercial change recorded with version lineage.',change.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult saveCommercialLine(
        Id referenceId, Id lineId, String externalId, String lineType, String description,
        Decimal sequence, Decimal value, Date deliveryDate, Boolean acceptanceRequired, Id workUnitId
    ) {
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to manage contract lines.');
        requireText(externalId,'Commercial-line identifier is required.');requireText(lineType,'Commercial-line type is required.');
        Commercial_Reference__c reference=[SELECT Id,Engagement__c,Valid_From__c,Valid_To__c FROM Commercial_Reference__c WHERE Id=:referenceId WITH USER_MODE LIMIT 1];
        if(deliveryDate!=null&&(deliveryDate<reference.Valid_From__c||deliveryDate>reference.Valid_To__c))fail('Commercial-line delivery date must fall inside the reference validity range.');
        if(workUnitId!=null&&[SELECT COUNT() FROM Work_Unit__c WHERE Id=:workUnitId AND Engagement__c=:reference.Engagement__c WITH USER_MODE]==0)fail('The linked work unit must belong to the same project.');
        Commercial_Line__c line;
        if(lineId==null)line=new Commercial_Line__c(Commercial_Reference__c=reference.Id,External_ID__c=externalId.trim());
        else line=[SELECT Id,Commercial_Reference__c FROM Commercial_Line__c WHERE Id=:lineId AND Commercial_Reference__c=:reference.Id WITH USER_MODE LIMIT 1];
        line.Line_Type__c=lineType;line.Description__c=description;line.Sequence__c=sequence==null?1:sequence;line.Value__c=value;
        line.Planned_Delivery_Date__c=deliveryDate;line.Acceptance_Required__c=acceptanceRequired==true;
        line.Acceptance_Status__c=acceptanceRequired==true?'Pending':'Not Required';line.Status__c='Active';line.Work_Unit__c=workUnitId;
        if(lineId==null){line=(Commercial_Line__c)Resource360Security.createable(new List<SObject>{line})[0];insert line;}else{line=(Commercial_Line__c)Resource360Security.updateable(new List<SObject>{line})[0];update line;}
        String correlation=correlationId();audit(correlation,'COMMERCIAL_LINE_SAVED','Commercial_Line__c',line.Id,1,'CONTRACT_SCOPE','Contract scope and acceptance control saved.',null,'Active');
        return result(true,'Commercial line saved.',line.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult saveWorkUnit(
        Id engagementId, Id workUnitId, String code, String name, String phase, Decimal sequence,
        Date startDate, Date endDate, Decimal plannedHours, Decimal dailyHours, Id assignedResourceId,
        Boolean milestone, Boolean deliverable, Boolean acceptanceRequired
    ) {
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to manage the work plan.');
        requireText(code,'Work-unit code is required.');requireText(name,'Work-unit name is required.');requireText(phase,'Phase is required.');requireDates(startDate,endDate);
        Engagement__c engagement=[SELECT Id,Start_Date__c,End_Date__c,Status__c FROM Engagement__c WHERE Id=:engagementId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(startDate<engagement.Start_Date__c||endDate>engagement.End_Date__c)fail('Work-unit dates must be inside the project dates.');
        if(milestone==true&&startDate!=endDate)fail('A milestone must start and finish on the same date.');
        validateAllocationCoverage(engagement.Id,assignedResourceId,startDate,endDate,dailyHours);
        if(workUnitId==null&&[SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:engagement.Id AND Work_Unit_Code__c=:code WITH USER_MODE]>0)fail('Work-unit code already exists in this project.');
        Work_Unit__c unit;
        if(workUnitId==null)unit=new Work_Unit__c(Engagement__c=engagement.Id,Work_Unit_Code__c=code.trim(),Baseline_Start_Date__c=startDate,Baseline_End_Date__c=endDate,Percent_Complete__c=0,Status__c='Planned');
        else unit=[SELECT Id,Engagement__c,Baseline_Start_Date__c,Baseline_End_Date__c,Status__c FROM Work_Unit__c WHERE Id=:workUnitId AND Engagement__c=:engagement.Id WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(unit.Status__c=='Complete'||unit.Status__c=='Cancelled')fail('Completed or cancelled work units cannot be edited.');
        unit.Name=name.trim();unit.Phase__c=phase.trim();unit.Sequence__c=sequence==null?1:sequence;unit.Start_Date__c=startDate;unit.End_Date__c=endDate;
        unit.Planned_Hours__c=plannedHours==null?0:plannedHours;unit.Daily_Hours__c=dailyHours==null?0:dailyHours;unit.Assigned_Resource__c=assignedResourceId;unit.Owner_User__c=UserInfo.getUserId();
        unit.Milestone__c=milestone==true;unit.Deliverable__c=deliverable==true;unit.Acceptance_Required__c=acceptanceRequired==true;unit.Acceptance_Status__c=acceptanceRequired==true?'Pending':'Not Required';
        if(workUnitId==null){unit=(Work_Unit__c)Resource360Security.createable(new List<SObject>{unit})[0];insert unit;}else{unit=(Work_Unit__c)Resource360Security.updateable(new List<SObject>{unit})[0];update unit;}
        engagement.Lifecycle_Stage__c='Delivery';engagement.Status__c='Active';update engagement;
        recalculateCriticalPath(engagement.Id);recalculateCompletion(engagement.Id);
        String correlation=correlationId();audit(correlation,'WORK_UNIT_SAVED','Work_Unit__c',unit.Id,1,'GANTT_PLAN','Task, baseline and resource assignment saved.',null,unit.Status__c);
        return result(true,'Work unit saved and project plan recalculated.',unit.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult rescheduleWorkUnit(Id workUnitId,Date startDate,Date endDate,Boolean cascadeSuccessors,String reason){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to reschedule the Gantt.');requireText(reason,'A reschedule reason is required.');requireDates(startDate,endDate);
        Work_Unit__c root=[SELECT Id,Engagement__c,Engagement__r.Start_Date__c,Engagement__r.End_Date__c,Start_Date__c,End_Date__c,Assigned_Resource__c,Daily_Hours__c,Status__c FROM Work_Unit__c WHERE Id=:workUnitId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(root.Status__c=='Complete'||root.Status__c=='Cancelled')fail('Completed or cancelled work units cannot be rescheduled.');
        if(startDate<root.Engagement__r.Start_Date__c||endDate>root.Engagement__r.End_Date__c)fail('Rescheduled dates must remain inside the project.');
        Integer startDelta=root.Start_Date__c.daysBetween(startDate);Integer endDelta=root.End_Date__c.daysBetween(endDate);Integer cascadeDelta=Math.abs(endDelta)>=Math.abs(startDelta)?endDelta:startDelta;root.Start_Date__c=startDate;root.End_Date__c=endDate;validateAllocationCoverage(root.Engagement__c,root.Assigned_Resource__c,startDate,endDate,root.Daily_Hours__c);update root;
        if(cascadeSuccessors==true&&cascadeDelta!=0)cascade(root.Engagement__c,root.Id,cascadeDelta,new Set<Id>{root.Id});
        validateDependencyDates(root.Engagement__c);recalculateCriticalPath(root.Engagement__c);
        String correlation=correlationId();audit(correlation,'WORK_UNIT_RESCHEDULED','Work_Unit__c',root.Id,1,cascadeSuccessors==true?'CASCADE_RESCHEDULE':'DIRECT_RESCHEDULE',reason,null,startDate+'–'+endDate);
        return result(true,'Work unit rescheduled'+(cascadeSuccessors==true?' with successors.':'.'),root.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult saveDependency(Id engagementId,Id predecessorId,Id successorId,String dependencyType,Decimal lagDays,String externalId){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to manage Gantt dependencies.');
        if(predecessorId==null||successorId==null||predecessorId==successorId)fail('Choose two different work units.');
        Set<Id> taskIds=new Map<Id,Work_Unit__c>([SELECT Id FROM Work_Unit__c WHERE Engagement__c=:engagementId WITH USER_MODE]).keySet();
        if(!taskIds.contains(predecessorId)||!taskIds.contains(successorId))fail('Both dependency work units must belong to the project.');
        String key=String.isBlank(externalId)?String.valueOf(engagementId)+'-'+predecessorId+'-'+successorId:externalId.trim();
        Work_Dependency__c dependency=new Work_Dependency__c(Engagement__c=engagementId,External_ID__c=key,Predecessor__c=predecessorId,Successor__c=successorId,Dependency_Type__c=String.isBlank(dependencyType)?'Finish-to-Start':dependencyType,Lag_Days__c=lagDays==null?0:lagDays);
        dependency=(Work_Dependency__c)Resource360Security.createable(new List<SObject>{dependency})[0];
        Savepoint dependencySavepoint=Database.setSavepoint();
        try{
            upsert dependency External_ID__c;
            if(hasCycle(engagementId))fail('This dependency creates a cycle and was not saved.');
            validateDependencyDates(engagementId);
            recalculateCriticalPath(engagementId);
        }catch(Exception dependencyError){
            Database.rollback(dependencySavepoint);
            fail(dependencyError.getMessage());
        }
        String correlation=correlationId();audit(correlation,'WORK_DEPENDENCY_SAVED','Work_Dependency__c',dependency.Id,1,'ACYCLIC_DEPENDENCY','Dependency saved and critical path recalculated.',null,dependency.Dependency_Type__c);
        return result(true,'Dependency saved.',dependency.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult updateProgress(Id workUnitId,Decimal percentComplete,String status,String note){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to update delivery progress.');requireText(note,'A progress note is required.');
        if(percentComplete==null||percentComplete<0||percentComplete>100)fail('Completion must be between 0 and 100.');
        Work_Unit__c unit=[SELECT Id,Engagement__c,Acceptance_Required__c,Acceptance_Status__c,Status__c,Percent_Complete__c FROM Work_Unit__c WHERE Id=:workUnitId WITH USER_MODE LIMIT 1 FOR UPDATE];
        String nextStatus=String.isBlank(status)?(percentComplete==100?'Complete':percentComplete>0?'Active':'Planned'):status;
        if(nextStatus=='Complete'&&unit.Acceptance_Required__c&&unit.Acceptance_Status__c!='Accepted')fail('Required acceptance must be recorded before completion.');
        unit.Percent_Complete__c=percentComplete;unit.Status__c=nextStatus;unit.Last_Progress_Update__c=System.now();update unit;recalculateCompletion(unit.Engagement__c);
        String correlation=correlationId();audit(correlation,'WORK_PROGRESS_UPDATED','Work_Unit__c',unit.Id,1,'DELIVERY_PROGRESS',note,String.valueOf(unit.Percent_Complete__c),String.valueOf(percentComplete));
        return result(true,'Work-unit progress updated.',unit.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult acceptDeliverable(Id workUnitId,String acceptanceNote){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to record deliverable acceptance.');requireText(acceptanceNote,'Acceptance evidence is required.');
        Work_Unit__c unit=[SELECT Id,Engagement__c,Acceptance_Required__c,Percent_Complete__c FROM Work_Unit__c WHERE Id=:workUnitId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(!unit.Acceptance_Required__c)fail('This work unit does not require acceptance.');
        unit.Acceptance_Status__c='Accepted';unit.Accepted_By__c=UserInfo.getUserId();unit.Accepted_At__c=System.now();if(unit.Percent_Complete__c==100)unit.Status__c='Complete';update unit;
        List<Commercial_Line__c>lines=[SELECT Id FROM Commercial_Line__c WHERE Work_Unit__c=:unit.Id AND Acceptance_Required__c=true];for(Commercial_Line__c line:lines){line.Acceptance_Status__c='Accepted';line.Accepted_By__c=UserInfo.getUserId();line.Accepted_At__c=System.now();if(unit.Percent_Complete__c==100)line.Status__c='Complete';}if(!lines.isEmpty())update lines;
        recalculateCompletion(unit.Engagement__c);String correlation=correlationId();audit(correlation,'DELIVERABLE_ACCEPTED','Work_Unit__c',unit.Id,1,'ACCEPTANCE_EVIDENCE',acceptanceNote,'Pending','Accepted');
        return result(true,'Deliverable and linked commercial acceptance recorded.',unit.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult saveRisk(Id engagementId,Id riskId,String externalId,String title,String description,String severity,Id ownerUserId,Date dueDate,String mitigation){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to manage delivery risks.');requireText(externalId,'Risk identifier is required.');requireText(title,'Risk title is required.');requireText(mitigation,'A mitigation is required.');
        Project_Risk__c risk=riskId==null?new Project_Risk__c(Engagement__c=engagementId,External_ID__c=externalId.trim(),Status__c='Open'):[SELECT Id,Engagement__c,Status__c FROM Project_Risk__c WHERE Id=:riskId AND Engagement__c=:engagementId WITH USER_MODE LIMIT 1 FOR UPDATE];
        risk.Title__c=title.trim();risk.Description__c=description;risk.Severity__c=severity;risk.Owner_User__c=ownerUserId==null?UserInfo.getUserId():ownerUserId;risk.Due_Date__c=dueDate;risk.Mitigation__c=mitigation;
        if(riskId==null){risk=(Project_Risk__c)Resource360Security.createable(new List<SObject>{risk})[0];insert risk;}else{risk=(Project_Risk__c)Resource360Security.updateable(new List<SObject>{risk})[0];update risk;}
        String correlation=correlationId();audit(correlation,'PROJECT_RISK_SAVED','Project_Risk__c',risk.Id,1,'ACCOUNTABLE_RISK',mitigation,null,risk.Status__c);return result(true,'Project risk saved.',risk.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult closeRisk(Id riskId,String closureNote){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to close delivery risks.');requireText(closureNote,'Risk closure evidence is required.');
        Project_Risk__c risk=[SELECT Id,Status__c FROM Project_Risk__c WHERE Id=:riskId WITH USER_MODE LIMIT 1 FOR UPDATE];risk.Status__c='Closed';risk.Closed_At__c=System.now();risk.Closure_Note__c=closureNote;update risk;
        String correlation=correlationId();audit(correlation,'PROJECT_RISK_CLOSED','Project_Risk__c',risk.Id,1,'MITIGATION_COMPLETE',closureNote,null,'Closed');return result(true,'Project risk closed.',risk.Id,correlation);
    }

    @AuraEnabled(cacheable=true)
    public static List<Engagement__c> getProjectOptions(){return [SELECT Id,Name,Engagement_ID__c,Account__r.Name,Portfolio__r.Name,Sub_Portfolio__r.Name,Start_Date__c,End_Date__c,Status__c,Lifecycle_Stage__c,Completion_Percent__c FROM Engagement__c WHERE Status__c!='Cancelled' WITH USER_MODE ORDER BY Account__r.Name,Name LIMIT 200];}

    @AuraEnabled(cacheable=true)
    public static List<R360_Portfolio__c> getPortfolioOptions(){return [SELECT Id,Name,Portfolio_ID__c,Account__c FROM R360_Portfolio__c WHERE Current__c=true WITH USER_MODE ORDER BY Name LIMIT 200];}

    @AuraEnabled
    public static String getProjectPlan(Id engagementId){
        Engagement__c engagement=[SELECT Id,Name,Engagement_ID__c,Account__c,Account__r.Name,Portfolio__c,Portfolio__r.Name,Portfolio_ID__c,Sub_Portfolio__c,Sub_Portfolio__r.Name,Project_Manager__c,Project_Manager__r.Name,Industry__c,Salesforce_Tower__c,Revenue_Type__c,Currency_Code__c,PO_Value__c,Start_Date__c,End_Date__c,Status__c,Lifecycle_Stage__c,Completion_Percent__c FROM Engagement__c WHERE Id=:engagementId WITH USER_MODE LIMIT 1];
        List<Work_Unit__c>units=[SELECT Id,Name,Engagement__c,Work_Unit_Code__c,Phase__c,Sequence__c,Start_Date__c,End_Date__c,Baseline_Start_Date__c,Baseline_End_Date__c,Status__c,Percent_Complete__c,Planned_Hours__c,Daily_Hours__c,Assigned_Resource__c,Assigned_Resource__r.Preferred_Name__c,Milestone__c,Deliverable__c,Acceptance_Required__c,Acceptance_Status__c,Critical_Path__c FROM Work_Unit__c WHERE Engagement__c=:engagement.Id AND Status__c!='Cancelled' WITH USER_MODE ORDER BY Sequence__c,Start_Date__c];
        List<Project_Module__c>modules=[SELECT Id,Name,Module_ID__c,Module_Type__c,Status__c,Health__c,Start_Date__c,End_Date__c,Completion_Percent__c,Planned_Budget__c,Actual_Cost__c,Owner_Resource__c,Owner_Resource__r.Preferred_Name__c FROM Project_Module__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Sequence__c];
        List<Work_Dependency__c>dependencies=[SELECT Id,External_ID__c,Predecessor__c,Successor__c,Dependency_Type__c,Lag_Days__c FROM Work_Dependency__c WHERE Engagement__c=:engagement.Id WITH USER_MODE];
        List<Allocation__c>allocations=[SELECT Id,Resource__c,Resource__r.Preferred_Name__c,Resource__r.Primary_Role__c,Resource__r.Tower__c,Delivery_Membership__c,Delivery_Membership__r.Delivery_Role__c,Delivery_Membership__r.Sub_Portfolio__r.Name,Work_Unit__c,Role__c,Start_Date__c,End_Date__c,Daily_Hours__c,Allocation_Percent__c,State__c FROM Allocation__c WHERE Engagement__c=:engagement.Id AND Current__c=true WITH USER_MODE ORDER BY Start_Date__c];
        List<Commercial_Reference__c>commercials=[SELECT Id,External_ID__c,Reference_Type__c,Version__c,Approval_Status__c,Value__c,Valid_From__c,Valid_To__c,Status__c FROM Commercial_Reference__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Version__c];
        List<Commercial_Line__c>commercialLines=[SELECT Id,External_ID__c,Commercial_Reference__c,Line_Type__c,Description__c,Value__c,Planned_Delivery_Date__c,Status__c,Acceptance_Required__c,Acceptance_Status__c,Work_Unit__c FROM Commercial_Line__c WHERE Commercial_Reference__r.Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Sequence__c];
        List<Contract_Payment__c>payments=[SELECT Id,Payment_ID__c,Commercial_Reference__c,Commercial_Reference__r.External_ID__c,Milestone__c,Sequence__c,Planned_Amount__c,Invoiced_Amount__c,Paid_Amount__c,Outstanding_Amount__c,Due_Date__c,Status__c,Invoice_Number__c,Acceptance_Required__c FROM Contract_Payment__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Commercial_Reference__c,Sequence__c];
        List<Budget__c>budgets=[SELECT Id,Version__c,State__c,Revenue__c,Total_Cost__c,Margin_Percent__c,Planned_Hours__c,Policy_Version__c FROM Budget__c WHERE Engagement__c=:engagement.Id AND Current__c=true WITH USER_MODE LIMIT 1];
        List<Engagement_Skill_Requirement__c>requirements=[SELECT Id,Requirement_Key__c,Dimension__c,Capability__c,Capability__r.Name,Required_Level__c,Required_Count__c,Weight_Percent__c,Mandatory__c,Requested_Role__c FROM Engagement_Skill_Requirement__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Dimension__c,Capability__r.Name];
        List<Staffing_Request__c>staffingRequests=[SELECT Id,Idempotency_Key__c,Requested_Role__c,Classification__c,Resource__c,Resource__r.Preferred_Name__c,Fit_Score__c,Priority__c,State__c,Start_Date__c,End_Date__c FROM Staffing_Request__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Priority__c,State__c];
        List<Project_Risk__c>risks=[SELECT Id,External_ID__c,Title__c,Severity__c,Status__c,Owner_User__c,Owner_User__r.Name,Due_Date__c,Mitigation__c,Closure_Note__c FROM Project_Risk__c WHERE Engagement__c=:engagement.Id WITH USER_MODE ORDER BY Severity__c DESC,Due_Date__c];
        List<Project_Closeout__c>closeouts=[SELECT Id,Closeout_ID__c,State__c,Completion_Date__c,Lessons_Learned__c,Customer_Acceptance_Note__c,All_Deliverables_Accepted__c,Timesheets_Reconciled__c,Allocations_Released__c,Open_Risk_Count__c,Submitted_At__c,Decision_At__c,Decision_Note__c FROM Project_Closeout__c WHERE Engagement__c=:engagement.Id AND Current__c=true WITH USER_MODE LIMIT 1];
        Map<String,Decimal>actualByWorkUnit=new Map<String,Decimal>();for(AggregateResult row:[SELECT Work_Unit__c unitId,SUM(Hours__c) hours FROM Time_Entry__c WHERE Engagement__c=:engagement.Id AND Work_Unit__c!=null AND State__c='Approved' WITH USER_MODE GROUP BY Work_Unit__c])actualByWorkUnit.put(String.valueOf(row.get('unitId')),(Decimal)row.get('hours'));
        GateSnapshot gates=gateSnapshot(engagement.Id);
        return JSON.serialize(new Map<String,Object>{'engagement'=>engagement,'modules'=>modules,'tasks'=>units,'dependencies'=>dependencies,'allocations'=>allocations,'skillRequirements'=>requirements,'staffingRequests'=>staffingRequests,'commercialReferences'=>commercials,'commercialLines'=>commercialLines,'contractPayments'=>payments,'budget'=>budgets.isEmpty()?null:budgets[0],'risks'=>risks,'closeout'=>closeouts.isEmpty()?null:closeouts[0],'actualHoursByWorkUnit'=>actualByWorkUnit,'closeoutGates'=>gates,'canManageProjects'=>Resource360Security.hasPermission('Resource360_Manage_Projects'),'canApproveCloseout'=>Resource360Security.hasPermission('Resource360_Approve_Closeout'),'zoomOptions'=>new List<String>{'Week','Month','Quarter','Year'},'generatedAt'=>System.now()});
    }

    @AuraEnabled(cacheable=true)
    public static GateSnapshot closeoutReadiness(Id engagementId){return gateSnapshot(engagementId);}

    @AuraEnabled
    public static Resource360Service.ServiceResult createCloseoutDraft(Id engagementId,Date completionDate,String lessonsLearned,String customerAcceptanceNote){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to prepare closeout.');requireText(lessonsLearned,'Lessons learned are required.');requireText(customerAcceptanceNote,'Customer acceptance evidence is required.');
        Engagement__c engagement=[SELECT Id,End_Date__c FROM Engagement__c WHERE Id=:engagementId WITH USER_MODE LIMIT 1];if(completionDate==null)completionDate=Date.today();
        List<Project_Closeout__c>existing=[SELECT Id,State__c FROM Project_Closeout__c WHERE Engagement__c=:engagement.Id AND Current__c=true WITH USER_MODE LIMIT 1];Project_Closeout__c closeout;
        if(existing.isEmpty())closeout=new Project_Closeout__c(Engagement__c=engagement.Id,Closeout_ID__c='PCO-'+String.valueOf(engagement.Id),Version__c=1,Current__c=true,State__c='Draft');else{closeout=existing[0];if(closeout.State__c=='Approved'||closeout.State__c=='Pending Approval')fail('Only a draft or rejected closeout can be edited.');}
        closeout.Completion_Date__c=completionDate;closeout.Lessons_Learned__c=lessonsLearned;closeout.Customer_Acceptance_Note__c=customerAcceptanceNote;closeout.State__c='Draft';
        if(existing.isEmpty()){closeout=(Project_Closeout__c)Resource360Security.createable(new List<SObject>{closeout})[0];insert closeout;}else{closeout=(Project_Closeout__c)Resource360Security.updateable(new List<SObject>{closeout})[0];update closeout;}
        String correlation=correlationId();audit(correlation,'PROJECT_CLOSEOUT_DRAFTED','Project_Closeout__c',closeout.Id,closeout.Version__c,'CLOSEOUT_CHECKLIST','Closeout draft saved.',null,'Draft');return result(true,'Project closeout draft saved.',closeout.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult submitCloseout(Id closeoutId){
        Resource360Security.requirePermission('Resource360_Manage_Projects','Project Manager permission is required to submit closeout.');
        Project_Closeout__c closeout=[SELECT Id,Engagement__c,Completion_Date__c,Lessons_Learned__c,Customer_Acceptance_Note__c,State__c,Version__c FROM Project_Closeout__c WHERE Id=:closeoutId WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(!new Set<String>{'Draft','Rejected'}.contains(closeout.State__c))fail('Only a draft or rejected closeout can be submitted.');requireText(closeout.Lessons_Learned__c,'Lessons learned are required.');requireText(closeout.Customer_Acceptance_Note__c,'Customer acceptance evidence is required.');
        GateSnapshot gates=gateSnapshot(closeout.Engagement__c);if(!gates.ready)fail('Closeout is blocked: '+String.join(gates.blockers,' '));
        releaseAllocations(closeout.Engagement__c,closeout.Completion_Date__c);
        String correlation=correlationId();closeout.State__c='Pending Approval';closeout.Submitted_By__c=UserInfo.getUserId();closeout.Submitted_At__c=System.now();closeout.Final_EAC__c=gates.finalEac;closeout.Final_Actual_Hours__c=gates.actualHours;closeout.All_Deliverables_Accepted__c=true;closeout.Timesheets_Reconciled__c=true;closeout.Allocations_Released__c=true;closeout.Open_Risk_Count__c=0;closeout.Correlation_ID__c=correlation;update closeout;
        Engagement__c engagement=[SELECT Id,Lifecycle_Stage__c FROM Engagement__c WHERE Id=:closeout.Engagement__c WITH USER_MODE LIMIT 1 FOR UPDATE];engagement.Lifecycle_Stage__c='Closeout';update engagement;
        R360_Approval_Decision__c decision=new R360_Approval_Decision__c(Decision_ID__c='PCO-'+closeout.Id+'-V'+closeout.Version__c+'-S1',Entity_Type__c='Project_Closeout__c',Entity_ID__c=String.valueOf(closeout.Id),Entity_Version__c=closeout.Version__c,Step_Number__c=1,Required_Role__c='Portfolio Manager',State__c='Pending',Correlation_ID__c=correlation);insert decision;
        audit(correlation,'PROJECT_CLOSEOUT_SUBMITTED','Project_Closeout__c',closeout.Id,closeout.Version__c,'ALL_GATES_PASSED','Completion gates passed and allocations were released.','Draft','Pending Approval');
        return result(true,'Project closeout submitted for independent approval.',closeout.Id,correlation);
    }

    @AuraEnabled
    public static Resource360Service.ServiceResult decideCloseout(Id closeoutId,Boolean approve,String note){
        Resource360Security.requirePermission('Resource360_Approve_Closeout','Closeout approver permission is required.');if(approve!=true)requireText(note,'A rejection reason is required.');
        Project_Closeout__c closeout=[SELECT Id,Engagement__c,Completion_Date__c,State__c,Version__c,Submitted_By__c,Correlation_ID__c FROM Project_Closeout__c WHERE Id=:closeoutId WITH USER_MODE LIMIT 1 FOR UPDATE];if(closeout.State__c!='Pending Approval')fail('Only a pending closeout can be decided.');if(closeout.Submitted_By__c==UserInfo.getUserId())fail('The closeout submitter cannot approve their own closeout.');
        closeout.State__c=approve==true?'Approved':'Rejected';closeout.Approver__c=UserInfo.getUserId();closeout.Decision_At__c=System.now();closeout.Decision_Note__c=note;update closeout;
        Engagement__c engagement=[SELECT Id,Status__c,Lifecycle_Stage__c,Completion_Percent__c FROM Engagement__c WHERE Id=:closeout.Engagement__c WITH USER_MODE LIMIT 1 FOR UPDATE];
        if(approve==true){engagement.Status__c='Completed';engagement.Lifecycle_Stage__c='Complete';engagement.Completion_Percent__c=100;engagement.Actual_End_Date__c=closeout.Completion_Date__c;}else engagement.Lifecycle_Stage__c='Delivery';update engagement;
        List<R360_Approval_Decision__c>decisions=[SELECT Id FROM R360_Approval_Decision__c WHERE Entity_Type__c='Project_Closeout__c' AND Entity_ID__c=:String.valueOf(closeout.Id) AND State__c='Pending' LIMIT 1];if(!decisions.isEmpty()){R360_Approval_Decision__c decision=decisions[0];decision.State__c=approve==true?'Approved':'Rejected';decision.Approver__c=UserInfo.getUserId();decision.Decided_At__c=System.now();decision.Decision_Note__c=note;update decision;}
        String correlation=String.isBlank(closeout.Correlation_ID__c)?correlationId():closeout.Correlation_ID__c;audit(correlation,approve==true?'PROJECT_COMPLETED':'PROJECT_CLOSEOUT_REJECTED','Project_Closeout__c',closeout.Id,closeout.Version__c,approve==true?'INDEPENDENT_APPROVAL':'APPROVER_REJECTED',note,'Pending Approval',closeout.State__c);
        return result(true,approve==true?'Project completed and closed.':'Project closeout rejected for correction.',closeout.Id,correlation);
    }

    private static GateSnapshot gateSnapshot(Id engagementId){
        GateSnapshot gates=new GateSnapshot();gates.blockers=new List<String>();
        gates.incompleteWorkUnits=[SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:engagementId AND Status__c NOT IN('Complete','Cancelled') WITH USER_MODE];
        gates.pendingAcceptances=[SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:engagementId AND Acceptance_Required__c=true AND Acceptance_Status__c!='Accepted' WITH USER_MODE];
        gates.openHighRisks=[SELECT COUNT() FROM Project_Risk__c WHERE Engagement__c=:engagementId AND Severity__c IN('High','Critical') AND Status__c NOT IN('Closed','Accepted') WITH USER_MODE];
        gates.unreconciledTimeEntries=[SELECT COUNT() FROM Time_Entry__c WHERE Engagement__c=:engagementId AND State__c!='Approved' WITH USER_MODE];
        gates.commercialApproved=[SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__c=:engagementId AND Status__c='Active' AND Approval_Status__c='Approved' WITH USER_MODE]>0;
        List<Budget__c>budgets=[SELECT Id,Total_Cost__c FROM Budget__c WHERE Engagement__c=:engagementId AND Current__c=true AND State__c='Approved' WITH USER_MODE LIMIT 1];gates.budgetApproved=!budgets.isEmpty();gates.finalEac=budgets.isEmpty()?0:budgets[0].Total_Cost__c;
        AggregateResult actual=[SELECT SUM(Hours__c) hours FROM Time_Entry__c WHERE Engagement__c=:engagementId AND State__c='Approved' WITH USER_MODE];gates.actualHours=(Decimal)actual.get('hours');if(gates.actualHours==null)gates.actualHours=0;
        if(gates.incompleteWorkUnits>0)gates.blockers.add(gates.incompleteWorkUnits+' work unit(s) are incomplete.');if(gates.pendingAcceptances>0)gates.blockers.add(gates.pendingAcceptances+' required acceptance(s) are pending.');if(gates.openHighRisks>0)gates.blockers.add(gates.openHighRisks+' high/critical risk(s) remain open.');if(gates.unreconciledTimeEntries>0)gates.blockers.add(gates.unreconciledTimeEntries+' time entry record(s) are not approved.');if(!gates.commercialApproved)gates.blockers.add('No active approved commercial reference exists.');if(!gates.budgetApproved)gates.blockers.add('No current approved budget exists.');gates.ready=gates.blockers.isEmpty();return gates;
    }

    private static void releaseAllocations(Id engagementId,Date completionDate){
        if(completionDate==null)completionDate=Date.today();List<Allocation__c>updates=new List<Allocation__c>();List<Allocation__c>inserts=new List<Allocation__c>();
        for(Allocation__c current:[SELECT Id,Parent_Allocation__c,Originating_Request__c,Resource__c,Engagement__c,Work_Unit__c,Role__c,Classification__c,Billable_Snapshot__c,Start_Date__c,End_Date__c,Daily_Hours__c,Version__c,Current__c,Responsible_Owner__c,Review_Date__c,Control_Reason__c FROM Allocation__c WHERE Engagement__c=:engagementId AND Current__c=true AND State__c='Accepted' WITH USER_MODE FOR UPDATE]){
            current.Current__c=false;current.State__c='Superseded';updates.add(current);
            Allocation__c ended=current.clone(false,false,false,false);ended.Parent_Allocation__c=current.Id;ended.End_Date__c=completionDate<current.Start_Date__c?current.Start_Date__c:completionDate>current.End_Date__c?current.End_Date__c:completionDate;ended.State__c='Ended';ended.Version__c=current.Version__c+1;ended.Current__c=true;ended.Control_Reason__c='Released by governed project closeout.';inserts.add(ended);
        }if(!updates.isEmpty())update updates;if(!inserts.isEmpty())insert inserts;
    }

    private static void validateAllocationCoverage(Id engagementId,Id resourceId,Date startDate,Date endDate,Decimal dailyHours){if(resourceId==null)return;Decimal hours=dailyHours==null?0:dailyHours;if([SELECT COUNT() FROM Allocation__c WHERE Engagement__c=:engagementId AND Resource__c=:resourceId AND Current__c=true AND State__c='Accepted' AND Start_Date__c<=:startDate AND End_Date__c>=:endDate AND Daily_Hours__c>=:hours WITH USER_MODE]==0)fail('The assigned resource needs a current accepted allocation covering the complete work-unit dates and daily effort.');}
    private static void cascade(Id engagementId,Id predecessorId,Integer delta,Set<Id>visited){if(visited.size()>50)fail('Cascade is limited to 50 work units.');for(Work_Dependency__c link:[SELECT Successor__c FROM Work_Dependency__c WHERE Engagement__c=:engagementId AND Predecessor__c=:predecessorId WITH USER_MODE]){if(visited.contains(link.Successor__c))continue;visited.add(link.Successor__c);Work_Unit__c next=[SELECT Id,Engagement__c,Engagement__r.Start_Date__c,Engagement__r.End_Date__c,Start_Date__c,End_Date__c,Assigned_Resource__c,Daily_Hours__c,Status__c FROM Work_Unit__c WHERE Id=:link.Successor__c WITH USER_MODE LIMIT 1 FOR UPDATE];if(next.Status__c=='Complete'||next.Status__c=='Cancelled')continue;Date shiftedStart=next.Start_Date__c.addDays(delta),shiftedEnd=next.End_Date__c.addDays(delta);if(shiftedStart<next.Engagement__r.Start_Date__c||shiftedEnd>next.Engagement__r.End_Date__c)fail('Cascade would move a successor outside project dates.');validateAllocationCoverage(engagementId,next.Assigned_Resource__c,shiftedStart,shiftedEnd,next.Daily_Hours__c);next.Start_Date__c=shiftedStart;next.End_Date__c=shiftedEnd;update next;cascade(engagementId,next.Id,delta,visited);}}
    private static void validateDependencyDates(Id engagementId){
        Map<Id,Work_Unit__c> tasks=new Map<Id,Work_Unit__c>([
            SELECT Id,Start_Date__c,End_Date__c
            FROM Work_Unit__c
            WHERE Engagement__c=:engagementId
            WITH USER_MODE
        ]);
        for(Work_Dependency__c link:[
            SELECT Predecessor__c,Successor__c,Dependency_Type__c,Lag_Days__c
            FROM Work_Dependency__c
            WHERE Engagement__c=:engagementId
            WITH USER_MODE
        ]){
            Work_Unit__c predecessor=tasks.get(link.Predecessor__c);
            Work_Unit__c successor=tasks.get(link.Successor__c);
            if(predecessor==null||successor==null)fail('A dependency references a work unit outside this project.');
            Integer lagDays=0;
            if(link.Lag_Days__c!=null)lagDays=link.Lag_Days__c.intValue();
            Boolean valid;
            if(link.Dependency_Type__c=='Start-to-Start'){
                valid=successor.Start_Date__c>=predecessor.Start_Date__c.addDays(lagDays);
            }else if(link.Dependency_Type__c=='Finish-to-Finish'){
                valid=successor.End_Date__c>=predecessor.End_Date__c.addDays(lagDays);
            }else if(link.Dependency_Type__c=='Start-to-Finish'){
                valid=successor.End_Date__c>=predecessor.Start_Date__c.addDays(lagDays);
            }else{
                valid=successor.Start_Date__c>=predecessor.End_Date__c.addDays(lagDays+1);
            }
            if(!valid)fail('A '+link.Dependency_Type__c+' dependency is violated; reschedule or cascade successor dates.');
        }
    }
    private static Boolean hasCycle(Id engagementId){Map<Id,Set<Id>>edges=new Map<Id,Set<Id>>();Set<Id>nodes=new Map<Id,Work_Unit__c>([SELECT Id FROM Work_Unit__c WHERE Engagement__c=:engagementId]).keySet();for(Id node:nodes)edges.put(node,new Set<Id>());for(Work_Dependency__c link:[SELECT Predecessor__c,Successor__c FROM Work_Dependency__c WHERE Engagement__c=:engagementId])edges.get(link.Predecessor__c).add(link.Successor__c);Set<Id>visiting=new Set<Id>(),visited=new Set<Id>();for(Id node:nodes)if(cycleVisit(node,edges,visiting,visited))return true;return false;}
    private static Boolean cycleVisit(Id node,Map<Id,Set<Id>>edges,Set<Id>visiting,Set<Id>visited){if(visiting.contains(node))return true;if(visited.contains(node))return false;visiting.add(node);for(Id child:edges.get(node))if(cycleVisit(child,edges,visiting,visited))return true;visiting.remove(node);visited.add(node);return false;}
    private static void recalculateCriticalPath(Id engagementId){List<Work_Unit__c>tasks=[SELECT Id,Start_Date__c,End_Date__c,Critical_Path__c FROM Work_Unit__c WHERE Engagement__c=:engagementId];if(tasks.isEmpty())return;Map<Id,Decimal>distance=new Map<Id,Decimal>();Map<Id,Id>previous=new Map<Id,Id>();Map<Id,Integer>indegree=new Map<Id,Integer>();Map<Id,List<Id>>edges=new Map<Id,List<Id>>();for(Work_Unit__c task:tasks){distance.put(task.Id,Decimal.valueOf(task.Start_Date__c.daysBetween(task.End_Date__c)+1));indegree.put(task.Id,0);edges.put(task.Id,new List<Id>());}for(Work_Dependency__c link:[SELECT Predecessor__c,Successor__c,Lag_Days__c FROM Work_Dependency__c WHERE Engagement__c=:engagementId]){edges.get(link.Predecessor__c).add(link.Successor__c);indegree.put(link.Successor__c,indegree.get(link.Successor__c)+1);}List<Id>queue=new List<Id>();for(Id node:indegree.keySet())if(indegree.get(node)==0)queue.add(node);Integer index=0;while(index<queue.size()){Id node=queue[index++];for(Id child:edges.get(node)){Work_Unit__c childTask;for(Work_Unit__c candidate:tasks)if(candidate.Id==child){childTask=candidate;break;}Decimal candidateDistance=distance.get(node)+childTask.Start_Date__c.daysBetween(childTask.End_Date__c)+1;if(candidateDistance>distance.get(child)){distance.put(child,candidateDistance);previous.put(child,node);}indegree.put(child,indegree.get(child)-1);if(indegree.get(child)==0)queue.add(child);}}Id longest;Decimal max=-1;for(Id node:distance.keySet())if(distance.get(node)>max){max=distance.get(node);longest=node;}Set<Id>critical=new Set<Id>();while(longest!=null){critical.add(longest);longest=previous.get(longest);}for(Work_Unit__c task:tasks)task.Critical_Path__c=critical.contains(task.Id);update tasks;}
    private static void recalculateCompletion(Id engagementId){List<Work_Unit__c>tasks=[SELECT Planned_Hours__c,Percent_Complete__c,Status__c FROM Work_Unit__c WHERE Engagement__c=:engagementId AND Status__c!='Cancelled'];Decimal weight=0,earned=0;for(Work_Unit__c task:tasks){Decimal item=task.Planned_Hours__c==null||task.Planned_Hours__c<=0?1:task.Planned_Hours__c;weight+=item;earned+=item*(task.Percent_Complete__c==null?0:task.Percent_Complete__c)/100;}Engagement__c engagement=[SELECT Id FROM Engagement__c WHERE Id=:engagementId LIMIT 1];engagement.Completion_Percent__c=weight==0?0:(earned/weight*100).setScale(2);update engagement;}
    private static void audit(String correlation,String action,String entityType,Id entityId,Decimal version,String reason,String detail,String beforeState,String afterState){Resource360AuditService.record(correlation,Resource360Security.decisionRole(action.contains('CLOSEOUT')?'Resource360_Approve_Closeout':'Resource360_Manage_Projects',action.contains('CLOSEOUT')?'Portfolio Manager':'Project Manager'),action,entityType,entityId,version,reason,detail,Resource360AuditService.state(beforeState,null),Resource360AuditService.state(afterState,detail));}
    private static Resource360Service.ServiceResult result(Boolean success,String message,Id recordId,String correlation){return new Resource360Service.ServiceResult(success,message,recordId,correlation);}
    private static String correlationId(){return EncodingUtil.convertToHex(Crypto.generateAesKey(128));}
    private static String hash(String value){return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256',Blob.valueOf(value)));}
    private static void requireDates(Date startDate,Date endDate){if(startDate==null||endDate==null||endDate<startDate)fail('Provide a valid inclusive date range.');}
    private static void requireText(String value,String message){if(String.isBlank(value))fail(message);}
    private static void fail(String message){throw new AuraHandledException(message);}
}
