  private void updateOpponentProbabilityUponMessageReceived(int CurrentAgreementIdx[], int nCurrentTurn, int nMessageType)
    {
        AutomatedAgentType agentType = null;
        double dPrevTypeProbability = 0;
        double dPrevOfferValue = 0;
        double dPrevOfferProbability = 0;
    double dOfferSum = 0;
    double dUpdatedTypeProbability = 0;
   
  
        // calculate posteriori proability using Bayes formula:
        // P(type | Ht) = [P(Ht|Type)*P(type)] / P(Ht)
        // where P(Ht) = sigam(i=1 to #types)[P(Ht|Type_i) * P(type_i)]
        // and P(Ht|Type_i) = luce number of Ht (Ht - last agreement)
        // [this is done incrementally after each agreement

        

        // calculate P(Ht)
        for (int i = 0; i < AGENT_TYPES_NUM; ++i)
        {
            agentType = agentTools.getCurrentTurnSideAgentType(_opponentType, i);
                    
            dPrevTypeProbability = _possibleOpponents[i]._probability;
            dPrevOfferValue = agentType.getAgreementValue(CurrentAgreementIdx, nCurrentTurn);
            dPrevOfferValue = Math.exp(dPrevOfferValue * PRECISION_VALUE);
            dPrevOfferProbability = dPrevOfferValue / _possibleOpponents[i]._allOffersUtilitySum;
            
            dOfferSum += (dPrevOfferProbability * dPrevTypeProbability);
        }

        // calculate P(type | Ht) and update P(type)
        for (int i = 0; i < AGENT_TYPES_NUM; ++i)
        {
        
agentType = agentTools.getCurrentTurnSideAgentType(_opponentType, i);
                    
        
dPrevTypeProbability = _possibleOpponents[i]._probability;
            dPrevOfferValue = agentType.getAgreementValue(CurrentAgreementIdx, nCurrentTurn);
            dPrevOfferValue = Math.exp(dPrevOfferValue * PRECISION_VALUE);
            dPrevOfferProbability = dPrevOfferValue / _possibleOpponents[i]._allOffersUtilitySum;
            
            dUpdatedTypeProbability = (dPrevOfferProbability * dPrevTypeProbability) / dOfferSum;
            
            _possibleOpponents[i]._probability = dUpdatedTypeProbability;
        
        }
        Global.logStdout("KBAgent.updateOpponentProbabilityUponMessageReceived", "Before opening the file", null);
   
PrintWriter pw = openPrintWriterForAppend(PROBABILTY_FILE_NAME + AutomatedAgent.SIDE_A_NAME + ".txt");
        if (pw!=null) {
            for (int i=0;i<AGENT_TYPES_NUM;i++)
            pw.print(_possibleOpponents[i]._opponentType + ":" + Double.toString(_possibleOpponents[i]._probability) + ",");
            pw.println();
            pw.close();
        } 
    }
    
    private void updateOpponentProbabilityUponMessageRejected(int CurrentAgreementIdx[], int nCurrentTurn, int nMessageType)
    {
        AutomatedAgentType agentType = null;
        double dPrevTypeProbability = 0;
        double dPrevOfferProbability = 0;
        double dOfferSum = 0;
        double dUpdatedTypeProbability = 0;
        double dAgentOfferSum = 0;
        
        String sRejectedMsg = _agentType.getAgreementStr(CurrentAgreementIdx);
        
   
        // calculate posteriori proability using Bayes formula:
        // P(type | Ht) = [P(Ht|Type)*P(type)] / P(Ht)
        // where P(Ht) = sigma(i=1 to #types)[P(Ht|Type_i) * P(type_i)]
        // and P(Ht|Type_i) = luce number of Ht (Ht - last agreement)
        // [this is done incrementally after each agreement

        // calculate P(Ht)
        for (int i = 0; i < AGENT_TYPES_NUM; ++i)
        {
            agentType = agentTools.getCurrentTurnSideAgentType(_opponentType, i);
                    
            dOfferSum += calcRejectionProbabilities(CurrentAgreementIdx, nCurrentTurn,_possibleOpponents[i]);
        }

        // calculate P(type | Ht) and update P(type)
        for (int i = 0; i < AGENT_TYPES_NUM; ++i)
        {
        
agentType = agentTools.getCurrentTurnSideAgentType(_opponentType, i);

            dPrevTypeProbability = _possibleOpponents[i]._probability;
            
            dAgentOfferSum = calcRejectionProbabilities(CurrentAgreementIdx, nCurrentTurn,_possibleOpponents[i]);

            dUpdatedTypeProbability = (dAgentOfferSum * dPrevTypeProbability) / dOfferSum;
            
            
            _possibleOpponents[i]._probability=dUpdatedTypeProbability;
        
        }
        
        PrintWriter pw = openPrintWriterForAppend(PROBABILTY_FILE_NAME + AutomatedAgent.SIDE_A_NAME + ".txt");
        if (pw!=null) {
            for (int i=0;i<AGENT_TYPES_NUM;i++)
            pw.print(_possibleOpponents[i]._opponentType + ":" + Double.toString(_possibleOpponents[i]._probability) + ",");
            pw.println();
            pw.close();
        }
    }
                
            
    // calculate probabilities and values upon rejection
    public double calcRejectionProbabilities(int CurrentAgreementIdx[], int nCurrentTurn,OpponentData opponentData)
    {
    
double dMessageValue=agentTools.getAgreementValue(agentTools.getCurrentTurnSideAgentType(_opponentType, opponentData._opponentTypeIDX), CurrentAgreementIdx, nCurrentTurn);
    
Bid sMessege = agentTools.getBidFromIndices(CurrentAgreementIdx);
        //double dMessageValue = agentTools.getAgreementValue(CurrentAgreementIdx);
        double dPrevTypeProbability = opponentData._probability;
        double dOfferValue = 0;
        double dOffersSum = 0;
        double dOfferProbability = 0;
        int totalAgreements=agentTools.getTotalAgreements(_agentType);
        boolean bSameOffer=false;
        for (int i = 0; i < totalAgreements; ++i)
        {
        
if (opponentData._sortedAllAgreements[i].agreement.equals(sMessege)) // wait till we pass the offer rejected
        
{
        
bSameOffer=true;
        
continue;
        
}
        
if (opponentData._sortedAllAgreements[i].value >= dMessageValue && bSameOffer) // sum all offers with better rank
            {
                dOfferValue = Math.exp(opponentData._sortedAllAgreements[i].value * PRECISION_VALUE);
                dOfferProbability = dOfferValue/opponentData._allOffersUtilitySum;
                
                dOffersSum += (dOfferProbability * dPrevTypeProbability);
            }
       
         
           
        }
        
        return dOffersSum;
    }