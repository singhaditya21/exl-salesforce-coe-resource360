@IsTest
private class Resource360GoldenPathDataTest {
    @TestSetup
    static void setup(){
        Resource360DemoData.seed();
        Resource360DemoScenarioData.ensure();
        Resource360GoldenPathData.ensure();
    }

    @IsTest
    static void goldenPathIsCoherentAndIdempotent(){
        Test.startTest();
        Resource360Service.ServiceResult repeated=Resource360GoldenPathData.ensure();
        Test.stopTest();
        System.assert(repeated.success);
        Engagement__c project=[SELECT Lifecycle_Stage__c,Completion_Percent__c FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        System.assertEquals('Delivery',project.Lifecycle_Stage__c);
        System.assertEquals(42,project.Completion_Percent__c);
        System.assertEquals(2,[SELECT COUNT() FROM Commercial_Reference__c WHERE Engagement__c=:project.Id AND External_ID__c IN('AMD-R360-1001-01','CO-R360-1001-01')]);
        System.assertEquals(6,[SELECT COUNT() FROM Commercial_Line__c WHERE External_ID__c LIKE 'GOLD-CL-%']);
        System.assertEquals(7,[SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:project.Id AND Work_Unit_Code__c LIKE 'WBS-SF-%']);
        System.assertEquals(1,[SELECT COUNT() FROM Work_Unit__c WHERE Engagement__c=:project.Id AND Work_Unit_Code__c='WBS-DC-01' AND Status__c='Cancelled']);
        System.assertEquals(7,[SELECT COUNT() FROM Work_Dependency__c WHERE Engagement__c=:project.Id AND External_ID__c LIKE 'GOLD-DEP-%']);
        System.assertEquals(11,[SELECT COUNT() FROM Engagement_Skill_Requirement__c WHERE Engagement__c=:project.Id AND Requirement_Key__c LIKE 'GOLD-REQ-%']);
        System.assertEquals(4,[SELECT COUNT() FROM Staffing_Request__c WHERE Engagement__c=:project.Id AND Idempotency_Key__c LIKE 'GOLD-SR-%' AND State__c='Accepted']);
        System.assertEquals(11,[SELECT COUNT() FROM Staffing_Skill_Match__c WHERE Match_Key__c LIKE 'GOLD-MATCH-%' AND Eligible__c=true]);
        System.assertEquals(4,[SELECT COUNT() FROM Allocation__c WHERE Engagement__c=:project.Id AND Originating_Request__r.Idempotency_Key__c LIKE 'GOLD-SR-%' AND Current__c=true]);
        System.assertEquals(2,[SELECT COUNT() FROM Project_Risk__c WHERE Engagement__c=:project.Id AND External_ID__c LIKE 'GOLD-RISK-%']);
        System.assertEquals(1,[SELECT COUNT() FROM Project_Closeout__c WHERE Engagement__c=:project.Id AND Closeout_ID__c='GOLD-CLOSEOUT-ENG-1001' AND State__c='Draft']);
    }

    @IsTest
    static void everyAcceptedGoldenCandidateHasTraceableSkillEvidence(){
        Engagement__c project=[SELECT Id FROM Engagement__c WHERE Engagement_ID__c='ENG-1001'];
        List<Staffing_Request__c>requests=[SELECT Id,Requested_Role__c,Resource__c,Work_Unit__c,(SELECT Id,Eligible__c,Requirement__r.Dimension__c,Requirement__r.Mandatory__c FROM Skill_Matches__r) FROM Staffing_Request__c WHERE Engagement__c=:project.Id AND Idempotency_Key__c LIKE 'GOLD-SR-%'];
        Set<String>dimensions=new Set<String>();
        for(Staffing_Request__c request:requests){
            System.assertNotEquals(null,request.Work_Unit__c,'Every golden staffing decision must align to planned work.');
            System.assert(!request.Skill_Matches__r.isEmpty(),'Every accepted golden candidate must retain match evidence.');
            for(Staffing_Skill_Match__c match:request.Skill_Matches__r){
                dimensions.add(match.Requirement__r.Dimension__c);
                if(match.Requirement__r.Mandatory__c)System.assert(match.Eligible__c,'A mandatory skill gate cannot be bypassed.');
            }
        }
        System.assertEquals(new Set<String>{'Industry','Functional','Technical'},dimensions);
        System.assertEquals(0,[SELECT COUNT() FROM Commercial_Line__c WHERE External_ID__c LIKE 'GOLD-CL-%' AND Work_Unit__c=null]);
        System.assertEquals(0,[SELECT COUNT() FROM Time_Entry__c WHERE Entry_Key__c LIKE 'GOLD-TE-%' AND Work_Unit__c=null]);
    }

    @IsTest
    static void approvedGoldenActualsCannotBeUpdatedOrDeleted(){
        Time_Entry__c entry=[SELECT Id,Comment__c FROM Time_Entry__c WHERE Entry_Key__c LIKE 'GOLD-TE-%' LIMIT 1];
        Boolean updateBlocked=false;try{entry.Comment__c='Forbidden rewrite';update entry;}catch(DmlException expected){updateBlocked=true;}System.assert(updateBlocked,'Approved actuals must be immutable on update.');
        Boolean deleteBlocked=false;try{delete entry;}catch(DmlException expected){deleteBlocked=true;}System.assert(deleteBlocked,'Approved actuals must be immutable on delete.');
    }

    @IsTest
    static void fullDemoPreparationRemainsIdempotentAfterGoldenActuals(){
        Resource360DemoData.seed();
        Test.startTest();
        Resource360GoldenPathData.ensure();
        Test.stopTest();
        System.assertEquals(2,[SELECT COUNT() FROM Timesheet__c WHERE Week_Key__c LIKE 'GOLD-TS-%']);
        System.assertEquals(2,[SELECT COUNT() FROM Time_Entry__c WHERE Entry_Key__c LIKE 'GOLD-TE-%']);
    }
}
