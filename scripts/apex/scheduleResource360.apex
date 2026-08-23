String jobName = 'Resource360 Operational Controls';
for (CronTrigger existing : [SELECT Id, CronJobDetail.Name FROM CronTrigger WHERE CronJobDetail.Name = :jobName]) {
    System.abortJob(existing.Id);
}
System.schedule(jobName, '0 0 * * * ?', new Resource360OperationsScheduler());
