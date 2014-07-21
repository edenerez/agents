 opponentRejected: function (offer, turn){
    var self = this;
    var curr = 0;  
    var prevTypeProbability = 0;
    var prevOfferValue = 0;
    var offerValue = 0;
    var updatedTypeProbability = 0;
    var offerSumAll = 0;
    var offerSunAgent = 0;

    /*if (self.wait){
      self.wait = false;
      self.recalculateSearchCluster(self.turn);
    }*/

    if (typeof(offer) != "object"){
      console.log(offer +" was rejected");
      var tempOffer = {};
      var exist = false;
      for(var i=0; i<self.B.length; i++){
        if (self.B[i].name == offer){
          exist = true;
          tempOffer[offer] = self.B[i].value;
          self.B.splice(i, 1);
          continue;
        }
      }
      if (!exist){
        for(var i=0; i<self.B_temp.length; i++){
          if (self.B_temp[i].name == offer){
            exist = true;
            tempOffer[offer] = self.B_temp[i].value;
            self.B.splice(i, 1);
            continue;
          }
        }
      }
      if( !exist){
        self.socket.emit('message', "What do you reject?");
        return;
      }
      if (!self.A.hasOwnProperty(offer)){ 
        self.A.push(offer);  
        }  
      self.gole = offer;
      offer = tempOffer;
      console.log(offer +" was rejected");
    }

    for (var i = 0; i < self.posibleOpponent.length; i++){ 
      var name = self.posibleOpponent[i].nikName; //the nik name of current opponent
      prevTypeProbability = self.posibleOpponent[i].probability;
      var ut = self['oppUtility'+name].getUtility(offer);
      prevOfferValue = self['oppUtility'+name].getUtilityWithDiscount(ut, turn); //calculate the utility with discount.
      offerSumAll += self.calcRejectionProbabilities(name, prevOfferValue, prevTypeProbability);
    } 

    for (var i = 0; i < self.posibleOpponent.length; i++){
      var name = self.posibleOpponent[i].nikName; //the nik name of current opponent
      prevTypeProbability = self.posibleOpponent[i].probability;
      var ut = self['oppUtility'+name].getUtility(offer);
      prevOfferValue = self['oppUtility'+name].getUtilityWithDiscount(ut, turn); //calculate the utility with discount.
      offerSunAgent = self.calcRejectionProbabilities(name, prevOfferValue, prevTypeProbability);

      updatedTypeProbability = (offerSunAgent * prevTypeProbability) / offerSumAll;
      self.posibleOpponent[i].probability =  updatedTypeProbability;//the new probability
    }
    self.currOpponent  = 0;
    for (var i = 0; i < self.posibleOpponent.length; i++){
      if (self.posibleOpponent[i].probability > self.posibleOpponent[self.currOpponent].probability){
        self.currOpponent = i;
        self.nik = self.posibleOpponent[i].nikName;
      }
    }

    //all above is calculation of the opponent - here is what should bw done for that NegoChatAgent:
    var keyOffer = Object.keys(offer);
    if (keyOffer > 0){
      self.gole = keyOffer[0];
    }
    console.log(self.searchCluster.length + " NUMBERS OF OFFER EXIST")
    self.removeFromSearchCluster(offer[self.gole]);// remove the current gole which the opponent rejected
    console.log(self.searchCluster.length + " NUMBERS OF OFFER LEFTED")
    logs.writeJsonLogGame(self.gameid, self.status, "the opponent REJECT THIS OFFER ", offer);

    self.temp = self.findValue();  //try to find a bid without the gole the opponent reject               
    if (self.temp){
      var exist = false;
      for (var i = 0; i<self.B_temp.length; i++){
        if (self.B_temp[i].name == self.gole){
          exist = true;
          self.B_temp[i].value = self.temp.bid[self.gole];
        }
        
      }
      if (!exist){
        self.B_temp[self.B_temp.length] = {}
        self.B_temp[self.B_temp.length-1].name = self.gole;
        self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
      }

      var goleR = {}

      goleR[self.gole] = self.temp.bid[self.gole];
      logs.writeJsonLogGame(self.gameid, self.status, "the opponent rejected my offer and the agent's new offer is ", goleR);

      for(var i = 0; i < self.discuss.length; i++){
        if(self.discuss[i].name == self.gole){
          if (self.discuss[i].lastOffer != goleR[self.gole])
            self.discuss[i].lastOffer = goleR[self.gole]
        }
      }
      return ([{'Offer' :goleR}]);
    }
    else{
      var tempb = clone(self.B);  //keep the B copy
      var tempa = clone(self.A);  //keep the A copy
      //keep the value we take out of our agreement to turn them back to black in the menue
      var backToBlack = {};
      self.recalculateSearchCluster(self.turn);
      self.removeFromSearchCluster(offer[self.gole]);
      var otherGole = self.gole;
      while (self.B.length > 0 && !self.temp){
        logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term ", self.B);
        logs.writeJsonLogGame(self.gameid, self.status, "AND WITH THE VALUE THAT THE OPPONENT REJECT! ", self.gole);
        
        var isGoleInA = false;
        for (var i = 0; i <self.A.length; i ++){
          if (self.A[i] == self.gole)
            isGoleInA = true;
        }
        if (!isGoleInA){
          self.A.push(self.gole);
        }
       
        self.gole = self.B[self.B.length-1].name;

        self.removeFromSearchCluster(self.B[self.B.length-1].value);
        backToBlack[self.B[self.B.length-1].name] = null;
        self.B.pop();
        self.B_temp = clone(self.B);
        self.temp = self.findValue();
        
        if (self.temp){//if it find a value with the current term add the offer to B
          self.B = clone(tempb);
          var inserted = false;
          for (var i = 0; i<self.B_temp.length; i++){
            if (self.B_temp[i].name == self.gole){
              self.B_temp[i].value = self.temp.bid[self.gole];
              inserted = true;
            }
          }
          for(var i = 0; i < self.discuss.length; i++){
            if(self.discuss[i].name == self.gole){
              if (self.discuss[i].lastOffer != self.temp.bid[self.gole])
                self.discuss[i].lastOffer = self.temp.bid[self.gole]
            }
          }
          if (!inserted){
            self.B_temp[self.B_temp.length] = {};
            self.B_temp[self.B_temp.length-1].name = self.gole;
            self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
          }
          var optional = {};
          optional[otherGole] = self.temp.bid[otherGole];
           
          for (i in backToBlack)
            if (i == self.gole)
              delete backToBlack[i];
          //this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});
          var goleR = convertBToObject(self.B_temp)
          self.B_temp[self.B_temp.length] = {};
          self.B_temp[self.B_temp.length-1].name = self.otherGole;
          self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.otherGole];

          logs.writeJsonLogGame(self.gameid, self.status, "find an acceptable bid with the current term ", self.B);
          logs.writeJsonLogGame(self.gameid, self.status, "AGENT OFFER SOMETHING ELSE!", self.B_temp);

          //goleR[self.gole] = self.temp.bid[self.gole];
          return ([{"Offer" : optional}, {'ChangeIssue': "previous"}, {"Offer" : goleR}] );
          //return (goleR);
        }
        else{ 
        // if there is any offer of the current term of B and the opponent offer 
        //push the gole to A and keep looking.
            var isInA = false;
            for (var i=0; i < self.A.length; i++){
              if (self.A == self.gole)
                isInA = true;
            }
            if(!isInA)
              self.A.push(self.gole);
        }
      }
      if (self.B.length == 0 && !self.temp){
        self.A = clone(tempa);
        self.B = clone(tempb);
        self.B_temp = clone(tempb);
        self.socket.emit('message', "Just a minute, I need to think a bit.");
        return;
      }
    }
  },