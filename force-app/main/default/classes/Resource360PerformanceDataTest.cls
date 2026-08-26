@IsTest
private class Resource360PerformanceDataTest {
    @IsTest static void seedsHistoricalAndForecastMetricsIdempotently() {
        Test.startTest();
        Map<String,Integer> first = Resource360PerformanceData.seed();
        Resource360PerformanceData.ensure();
        Test.stopTest();
        System.assertEquals(174, first.get('kpiSnapshots'));
        System.assertEquals(174, [SELECT COUNT() FROM R360_KPI_Snapshot__c]);
        System.assertEquals(78, [SELECT COUNT() FROM R360_KPI_Snapshot__c WHERE Forecast__c=true]);
        System.assertEquals(96, [SELECT COUNT() FROM R360_KPI_Snapshot__c WHERE Forecast__c=false]);
        System.assertEquals(0, [SELECT COUNT() FROM R360_Resource_Unavailability__c]);
    }
}
