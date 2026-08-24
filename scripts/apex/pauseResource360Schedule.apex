for (CronTrigger existing : [SELECT Id FROM CronTrigger WHERE CronJobDetail.Name = 'Resource360 Operational Controls']) {
    System.abortJob(existing.Id);
}
