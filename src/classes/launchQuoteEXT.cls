public with sharing class launchQuoteEXT {
    private final Opportunity o;
    public launchQuoteEXT(ApexPages.StandardController controller) {
        this.o = (Opportunity)controller.getRecord();
        
    }
    
    public string getjParameters(){
        string s;
        s= JSON.serialize(o);
        system.debug('\n\n');
        system.debug('\n\n'+s);
        system.debug('\n\n');
        return s;
    }

}