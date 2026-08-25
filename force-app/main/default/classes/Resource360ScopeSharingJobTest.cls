@IsTest
private class Resource360ScopeSharingJobTest {
    @IsTest
    static void rebuildsAChunkAndHandlesEmptyInput(){
        Resource360DemoData.seed();
        Test.startTest();
        new Resource360ScopeSharingJob(null).execute(null);
        new Resource360ScopeSharingJob(new Set<Id>{UserInfo.getUserId()}).execute(null);
        Test.stopTest();
        System.assert([SELECT COUNT() FROM R360_Role_Scope__c WHERE User__c=:UserInfo.getUserId() AND Active__c=true]>0);
    }
}
