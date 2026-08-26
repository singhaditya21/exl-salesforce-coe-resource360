Resource360Service.ServiceResult result = Resource360DemoData.seed();
Id scaleJobId = System.enqueueJob(new Resource360ScaleDemoData());
System.debug(LoggingLevel.INFO, JSON.serialize(new Map<String, Object>{
    'core' => result,
    'scaleJobId' => scaleJobId
}));
