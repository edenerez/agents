checkBid: function (offer, turn){
    var self = this;
    logs.writeJsonLogGame(self.gameid, self.status, "opponent offer this! ", offer);
    /*if (self.wait){
      self.wait = false;
      self.recalculateSearchCluster(self.turn);
    }*/
    var len = 0;
    for (var o in offer) {
        len++;
    }
    // check if the bid is full.
    if (len ==  self.issuesLength) {
      // find the number of the current bid.
      var bidNum = self.findCurrBid(offer);
      var currUtil = self.initBids[bidNum]['utilOpp'+self.nik]
      self.checkOpponent(turn, offer);
      //console.log("CURRENT OPPONENT " +self.posibleOpponent[self.currOpponent].nikName);
      //console.log("############################################");

      var currUtil = self['oppUtility'+self.nik].getUtilityWithDiscount(self.initBids[bidNum]['utilOpp'+self.nik], turn);
      var myUtility = self['myUtilityShort'].getUtilityWithDiscount(self.initBids[bidNum]['utilMe'], turn);
      //console.log("OPPONENT UTILITY ++++++++++++++++ "+ currUtil +" ++++++++++++++++")
      //console.log("MY UTILITY ++++++++++++++++ "+ myUtility +" ++++++++++++++++")
      if(myUtility >= this.posibleOpponent[this.currOpponent].agentAcceptThersholds[turn]) 
          return ([{"Accept" : offer}]);
      else
          return ([{"Reject" : offer}]);
    }
    //if the bid is not full do the follow - the NegoAgent.
    else{ 
      var isInDiscuss = false;
      for(var i = 0; i < self.discuss.length; i++){
        for (issue in offer){
          if(self.discuss[i].name == issue){
            isInDiscuss = true;
            if (self.discuss[i].lastOffer != offer[issue])
              self.discuss[i].lastOffer = offer[issue];
          }
        }
      }
      if(!isInDiscuss){
        for (issue in offer){
          var pushToDiscuss = {};
          pushToDiscuss.name = issue;
          pushToDiscuss.lastOffer = offer[issue];
          self.discuss.push(pushToDiscuss);
        }
      }
      //if there is a dubble offer like 8 or 9 hours pick the best for the agent.
      if (doubleBid(offer)){
        offer = self.pikBestOffer(offer);
      }
      //if the offer was negotiate before teke it out from B.
      for (issue in offer){
        for (var i = 0; i< self.B.length; i++){
           if (self.B[i].name == issue){
              self.B.splice(i, 1); 
              i--;
           }
        }
        for (var i = 0; i< self.B_temp.length; i++){
           if (self.B_temp[i].name == issue){
              self.B_temp.splice(i, 1);
              i--; 
           }
        }
      }
      // when the opponent offer something, the agent looking for an acceptable bid 
      //in the search cluster.
      self.temp = self.findValueWithOffer(offer); 
      if (self.temp){
        for(issue in offer){
          for (var i = 0; i< self.A.length; i++){
            if (self.A[i] == issue){
              self.A.splice(i, 1); 
              i--
            }
          }

          for (var i = 0; self.discuss.length <i; i++){
            if (self.discuss[i] == issue){
              self.discuss.splice(i, 1);
              i--;
            }
          }
          self.B[self.B.length] = {};
          self.B[self.B.length-1].name = issue;
          self.B[self.B.length-1].value = offer[issue];
          self.B_temp = clone(self.B);         
        }

        for(issue in self.B){
          for (var i = 0; i< self.A.length; i++){
            if (self.A[i] == issue){
              self.A.splice(i, 1); 
              i--
            }
          }
        }
   
        
        logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER ACCEPTED! ", offer);
        logs.writeJsonLogGame(self.gameid, self.status, "current agreement: ", self.B);
        logs.writeJsonLogGame(self.gameid, self.status, "left to agree on: ", self.A);
        
        var offerWithAccept = self.pickBid(self.turn);//self.pickBidForYou(self.turn);
        var bobj = convertBToObject(self.B)
        self.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: bobj, role: self.role});
        if (offerWithAccept){
          if (offerWithAccept != "done"){
            return ([{"Accept" : offer}, {'StartNewIssue': offerWithAccept[self.gole]}, {"Offer" : offerWithAccept}]);
          }
          else{
            return ([{"Accept" : offer}, {"currentAgreement": bobj}]);
          }
        }
        else{
           return ([{"Accept" : offer}, {"currentAgreement": bobj}]);
        }
      }
      else{
        var tempb = clone(self.B);  //keep the B copy
        var tempa = clone(self.A);  //keep the A copy
        self.B_temp = clone(self.B);
        //keep the value we take out of our agreement to turn them back to black in the menue
        var backToBlack = {};
        var theOriginalOffer = clone(offer);
        //self.socket.emit('message', 'Sorry, I can not do that');
        
        logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term ", self.B);
        logs.writeJsonLogGame(self.gameid, self.status, "and ", offer);
      
        self.recalculateSearchCluster(self.turn);
        for (issue in theOriginalOffer){
          self.removeFromSearchCluster(theOriginalOffer[issue]);
        }
        self.temp = self.findValueWithOffer();
        console.dir(self.temp);
        console.log("couldnt find something else")
        if (self.temp){

          self.B_temp = clone(self.B);
          var goleR = {}
          for(issue in theOriginalOffer){ //if the issue that the opponent offer exsist in A delete it from there
           //add the offer to B_temp
            goleR[issue] = self.temp.bid[issue];
            self.B_temp[self.B_temp.length] = {};
            self.B_temp[self.B_temp.length-1].name = issue;
            self.B_temp[self.B_temp.length-1].value = self.temp.bid[issue];
            for(var i = 0; i < self.discuss.length; i++){
              if(self.discuss[i].name == issue){
                if (self.discuss[i].lastOffer != goleR[issue])
                  self.discuss[i].lastOffer = goleR[issue]
              }
            }
            for (i in backToBlack)
              if (i == issue)
                delete backToBlack[i];
          }
            
          // add the gole that we set lower to B
                
          //this.socket.emit('message', 'Can I propose the following counter-offer?');
          logs.writeJsonLogGame(self.gameid, self.status, "find another acceptable bid with the current term ", self.temp);
          logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER DENIED OFFERING SOMETHING ELSE! ", self.B_temp);
     
          //this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
          self.B = clone(tempb);
          //self.A - clone(tempa);
          //otherBidOption[self.gole] = self.temp.bid[self.gole];
          logs.writeJsonLogGame(self.gameid, self.status, "the agent new offer: ", goleR);
          console.log("offer is rejected and offer something else")
          return ([{"Reject" : theOriginalOffer}, {"Offer" : goleR}] );
        }
        else{
          // if the agent can not find an offer with the B rerm and the opponent offer he recalculate the search cluster
          //self.A.push(self.B[self.aspiredIndex].name);
          
          //self.recalculateSearchCluster(self.turn);
          while(self.B.length > 0 && !self.temp){

            logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term set the offer lower", self.B);
            logs.writeJsonLogGame(self.gameid, self.status, "and ", offer);
          
            //self.recalculateSearchCluster(self.turn);
            //for (issue in theOriginalOffer){
              //self.removeFromSearchCluster(theOriginalOffer[issue]);
            //}

            self.gole = self.B[self.B.length-1].name;
            
            backToBlack[self.B[self.B.length-1].name] = null;
            var remove = self.B[self.B.length-1].value;
            //put the last value they agreed on from B, remove all the offers with that value from the search cluster and pop it from B.
            self.B.pop();
            self.removeFromSearchCluster(remove);
            //looking for the offer with the current term in B
            self.temp = self.findValueWithOffer(offer);
            if (self.temp){ //if it find a value with the current term
              self.B_temp = clone(self.B);
              for(issue in offer){ //if the issue that the opponent offer exsist in A delete it from there
                for (var i = 0; i< tempa.length; i++){
                  if (tempa[i] == issue){
                    tempa.splice(i, 1);
                    i--;
                  }
                } //add the offer to B_temp
                self.B_temp[self.B_temp.length] = {};
                self.B_temp[self.B_temp.length-1].name = issue;
                self.B_temp[self.B_temp.length-1].value = offer[issue];
              }
            
              var goleR = offer;
              goleR[self.gole] = self.temp.bid[self.gole];

              for(var i = 0; i < self.discuss.length; i++){
                if(self.discuss[i].name == self.gole){
                  if (self.discuss[i].lastOffer != goleR[self.gole])
                    self.discuss[i].lastOffer = goleR[self.gole]
                }
              }

              // add the gole that we set lower to B
              self.B_temp[self.B_temp.length] = {};
              self.B_temp[self.B_temp.length-1].name = self.gole;
              self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
              var offerToAccept = clone(self.B_temp);

              //this.socket.emit('message', 'Can I propose the following counter-offer?');
              logs.writeJsonLogGame(self.gameid, self.status, "find an acceptable bid with the current term ", self.temp);
              logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER DENIED OFFERING SOMETHING ELSE! ", self.B_temp);
             
              for (i in backToBlack)
                if (i == self.gole)
                  delete backToBlack[i];
              this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
              self.B = clone(tempb);
              //self.A - clone(tempa);
              
              //var otherBidOption = {};
              logs.writeJsonLogGame(self.gameid, self.status, "the agent is workoing ", self.temp);
              console.log("the agent is workoing");
              for(var i = 0; i< offerToAccept.length; i++){
                for(issue in theOriginalOffer){
                  //otherBidOption[issue] = lastBid[issue]
                  if (offerToAccept[i].name == issue){
                    offerToAccept.splice(i,1);
                    i--;
                  }

                }
              }

             //otherBidOption[self.gole] = self.temp.bid[self.gole];
             logs.writeJsonLogGame(self.gameid, self.status, "the agent is still workoing ", self.temp);
             console.log("the agent is still workoing");
              logs.writeJsonLogGame(self.gameid, self.status, "the 'accept' part ", offer);
              logs.writeJsonLogGame(self.gameid, self.status, "the 'offer' part ", offerToAccept);
              
              return ([{"Accept" : theOriginalOffer}, {'ChangeIssue': "previous"}, {"Offer" : convertBToObject(offerToAccept)}]);
            }
          // if there isn't any offer of the current term of B and the opponent offer push the gole to A and keep looking.
          }
         
          //if there is no way the agent agreed to an offer, he put back B to what it wes and reject the offer.
          if (self.B.length == 0 && !self.temp){
            var isInA = false;
            for (var i=0; i < tempa.length; i++){
              if (tempa == self.gole)
                isInA = true;
            }
            if(!isInA)
              tempa.push(self.gole);
            
            logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER DENIED! ", offer);
            self.B = clone(tempb);
            self.B_temp = clone(tempb);
            self.A = clone(tempa);
            return ([{"Reject" : offer}]);
          }
        }
      }
    }
  },