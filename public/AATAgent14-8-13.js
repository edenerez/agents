

module.exports = NegoChatAgent;

var Analysis = require('../analysis/analysis');
var UtilitySpace = require('../analysis/utilitySpace');
var logger = require('../logger')
var OpponentData = require('../analysis/opponentData');
var PRECISION_VALUE = 0.3  // used in order to scale utilities and make them positive



function NegoChatAgent(domain, role, oppRole) {
  this.domain = domain;
  this.role = role;
  this.numOfBids = 0;
  this.socket;
  this.posibleOpponent = new Array();
  this.myUtilityShort = new UtilitySpace(domain.agentsByOwnerAndPersonality[role.toLowerCase()]['short-term'].utility_space_object);
  this.oppUtilityShort = new UtilitySpace(domain.agentsByOwnerAndPersonality[oppRole.toLowerCase()]['short-term'].utility_space_object);
  this.oppUtilityComp = new UtilitySpace(domain.agentsByOwnerAndPersonality[oppRole.toLowerCase()]['comp-romise'].utility_space_object);
  this.oppUtilityLong = new UtilitySpace(domain.agentsByOwnerAndPersonality[oppRole.toLowerCase()]['long-term'].utility_space_object);
  this.issuesLength; //the issues' number.
  this.currOpponent = 0;// the 
  this.nik; //the nikname of the current opponent type.
  this.searchCluster;
  this.constForThreshold = 200; //for now i subtracts that value from the agent threshold - should be another value for that
  this.A = [];
  this.aspiredIndex = 0;
  this.A = this.myUtilityShort.enterEsperationScale();
  this.B = [];
  this.B_temp = [];
  this.turn;
  console.log("NegoChatAgent", "default constractor");

}

NegoChatAgent.prototype = {

  initializeBids: function (domain){
    this.issuesLength = domain.issues.length;
    var items = new Array(this.issuesLength);   
    for (var i = 0; i < this.issuesLength; i++) {
      var a = domain.issues[i].$.name;
      items[i] = [];
      items[i]["name"] = a;
      items[i]["value"] = [];
      
      for ( var j = 0; j < domain.issues[i].item.length; j++) {

        items[i]["value"][j] = domain.issues[i].item[j].$.value;
      }
    };
    analysis = new Analysis(items);
    this.sumUtilMe = 0;
    this.sumUtilOppShort = 0;
    this.sumUtilOppComp = 0;
    this.sumUtilOppLong = 0;
    var a = analysis.hasNext();
    //console.log(a);
    var b = analysis.makeNextIndex();
    //console.log(b);
    var bids = new Object();
    while (analysis.hasNext()){
      this.numOfBids++;
      bids[this.numOfBids] = {};
      var bid = analysis.next();
      bids[this.numOfBids].bid = bid;//JSON.stringify(bid);
      bids[this.numOfBids].utilMe = Math.round(this.myUtilityShort.getUtility(bid));
      this.sumUtilMe += bids[this.numOfBids].utilMe;
      bids[this.numOfBids].utilOppShort = Math.round(this.oppUtilityShort.getUtility(bid));
      this.sumUtilOppShort += Math.exp(bids[this.numOfBids].utilOppShort* PRECISION_VALUE);
      bids[this.numOfBids].utilOppComp = Math.round(this.oppUtilityComp.getUtility(bid));
      this.sumUtilOppComp += Math.exp(bids[this.numOfBids].utilOppComp * PRECISION_VALUE);
      bids[this.numOfBids].utilOppLong = Math.round(this.oppUtilityLong.getUtility(bid));
      this.sumUtilOppLong += Math.exp(bids[this.numOfBids].utilOppLong * PRECISION_VALUE);
    }
    //console.log(this.sumUtilOppShort + "<------------------");
    this.initBids = bids;
    this.oppUtilityShort.AvrageValuesPerIssue = this.posibleOpponent[0].AvrageValuesPerIssue;    
    this.oppUtilityComp.AvrageValuesPerIssue = this.posibleOpponent[1].AvrageValuesPerIssue;
    this.oppUtilityLong.AvrageValuesPerIssue = this.posibleOpponent[2].AvrageValuesPerIssue;
  },

  initializeNegoChatAgent: function (){
    var self = this;
    if (self.role == 'Employer'){
      self.posibleOpponent.push(new OpponentData('A', 'ShortTerm', 'Short'));
      self.posibleOpponent.push(new OpponentData('A', 'Compromise', 'Comp'));
      self.posibleOpponent.push(new OpponentData('A', 'LongTerm', 'Long'));
    }
    else {
      self.posibleOpponent.push(new OpponentData('B', 'ShortTerm', 'Short'));
      self.posibleOpponent.push(new OpponentData('B', 'Compromise', 'Comp'));
      self.posibleOpponent.push(new OpponentData('B', 'LongTerm', 'Long'));
    }


    self.currOpponent = Math.round(Math.random() * 2);
    self.nik = self.posibleOpponent[self.currOpponent].nikName;
    for (var i = 0; i < self.posibleOpponent.length; i++){
      self.posibleOpponent[i].probability = 1/self.posibleOpponent.length;
      self.posibleOpponent[i].calcProbability = 1/self.posibleOpponent.length;
    }
  },


  pickBid: function (turn){

    var self = this;
    self.turn = turn;
    if (!self.posibleOpponent){
      throw new Error ("possible opponent not define");
      console.dir(self);
    }
    if (!self.posibleOpponent[self.currOpponent]){
      throw new Error ("possible opponent["+self.currOpponent+"] not define");
      console.dir(self);
    }
    if (!self.posibleOpponent[self.currOpponent].agentOffers){
      throw new Error ("possible opponent["+self.currOpponent+"].agentOffers not define");
      console.dir(self);
    }
    //console.log("CURRENT OPPONENT " +self.posibleOpponent[self.currOpponent].nikName);
    //console.log("############################################");

    if (self.A.length > 0){ //if A.length is bigger than 0 it is mean that there are more issues to discuss on.
      console.log("***** offer the first value of " + self.A + "*****");
      console.log("---------------------------------------------------");
      this.recalculateSearchCluster(turn);
      self.gole = self.A[0];//the first issue to discuss on
      
      self.temp = self.findValue();
      if (self.temp){
        //come back later to here!!
        /*for (var i = 0; i < self.B.length; i++){
          self.btemp[self.B[i].name] = self.B[i].value;
        }
*/
        console.log("the agent's offer is" + self.gole + " "+ self.temp.bid[self.gole]);
        console.log("---------------------------------------------------");
        var goleR = {}
        goleR[self.gole] = self.temp.bid[self.gole];
        return (goleR);
      }
    }
    else{
      this.socket.emit('message', "I guess we discuss everything and we can sign the agreement");
    }
  },

  findValue: function (){
    var self = this;
    var maxUtility = -1000;
    var currBid = undefined;
    for (bid in self.searchCluster){
      var flag = true;
      if (Object.keys(self.B).length != 0){
        for (val in self.B){
          if (self.searchCluster[bid].bid[self.B[val].name] != self.B[val].value)
            flag = false;
        }
      }
      if(self.searchCluster[bid].utilMe > maxUtility && flag){
          maxUtility = self.searchCluster[bid].utilMe;
          currBid = self.searchCluster[bid];
      }
    }
    return currBid;
  },

    findValueWithOffer: function (offer){
    var self = this;
    var maxUtility = -1000;
    var currBid = undefined;
    for (bid in self.searchCluster){
      var flag = true;
      var flag2 = true;
      if (Object.keys(self.B).length != 0){
        for (val in self.B){
          if (self.searchCluster[bid].bid[self.B[val].name] != self.B[val].value)
            flag = false;
        }
      }
      for (issue in offer){
        if (self.searchCluster[bid].bid[issue] != offer[issue])
          flag2 = false;
      }
      if(self.searchCluster[bid].utilMe > maxUtility && flag && flag2){
          maxUtility = self.searchCluster[bid].utilMe;
          currBid = self.searchCluster[bid];
      }
    }
    return currBid;
  },

  recalculateSearchCluster: function(turn){
    var self = this;
    agentThreshold = this.posibleOpponent[this.currOpponent].agentAcceptThersholds[turn];
    oppThreshold = agentThreshold - this.constForThreshold;
    self.searchCluster = [];
    var i = 0;
    for (bid in this.initBids){
      if (self.initBids[bid].utilMe > agentThreshold && self.initBids[bid]['utilOpp'+self.nik] > oppThreshold){
        self.searchCluster[i] = self.initBids[bid];
        i++;
      }

    }
    //console.log(self.searchCluster.length + "$#$#$#$#$");
  },

  opponentAccepted: function (offer, turn){
    var self = this;
    for (var i = 0; i< self.A.length; i++){
      if (self.A[i] == issue){
        self.A.splice(i, 1);
        continue; 
      }
    }
    var isGoleInB = false;
    for (var i = 0; i <self.B.length; i ++){
      if (self.B[i].name == self.gole)
        isGoleInB = true;
    }
    if (!isGoleInB){
      self.B[self.aspiredIndex] = {};
      self.B[self.aspiredIndex].name = self.gole;
      self.B[self.aspiredIndex].value = offer[self.gole];
      self.aspiredIndex++;
    }
    console.log("the opponent agreed on the agent's offer. the current agreement is:")
    console.dir(self.B);
    console.log("---------------------------------------------------");
    if (self.A.length == 0){
      return "done";
    }

    return;
  },

  opponentRejected: function (offer, turn){
    var self = this;
    var curr = 0;  
    var prevTypeProbability = 0;
    var prevOfferValue = 0;
    var offerValue = 0;
    var updatedTypeProbability = 0;
    var offerSumAll = 0;
    var offerSunAgent = 0;

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
      //console.log(self.posibleOpponent[i].nikName);
      //console.log(self.posibleOpponent[i].probability);
      if (self.posibleOpponent[i].probability > self.posibleOpponent[self.currOpponent].probability){
        self.currOpponent = i;
        self.nik = self.posibleOpponent[i].nikName;
      }
    }

    //all above is calculation of the opponent - here is what should bw done for that NegoChatAgent:
    self.removeFromSearchCluster(offer[self.gole]);// remove the current gole which the opponent rejected
    console.log("***************************************************");
    console.log("***************************************************");
    console.log(offer[self.gole]);
    console.log("***************************************************");
    console.log("***************************************************");
    self.temp = self.findValue();  //try to find a bid without the gole we                
      if (self.temp){
        console.log("the opponent rejected my offer and the agent's new offer is " +self.gole + " " + self.temp.bid[self.gole]);
        console.log("---------------------------------------------------");
        var goleR = {}
        goleR[self.gole] = self.temp.bid[self.gole];
        return (goleR);
      }
      else{
        var tempb = clone(self.B);  //keep the B copy
        var tempa = clone(self.A);  //keep the A copy
         //keep the value we take out of our agreement to turn them back to black in the menue
        var backToBlack = {};
 
        while (self.B.length > 0 && !self.temp){
          console.log("couldn't find an acceptable bid with the current term")
          console.dir(self.B);
          console.dir('AND WITH THE VALUE OF '+ self.gole + " THAT THE OPPONENT REJECT!");
          console.log("------------------------------------------------------------");
          
          var isGoleInA = false;
          for (var i = 0; i <self.A.length; i ++){
            if (self.A[i] == self.gole)
              isGoleInA = true;
          }
          if (!isGoleInA){
            self.A.push(self.gole);
          }
          
          self.aspiredIndex--;
          self.gole = self.B[self.aspiredIndex].name;
          self.recalculateSearchCluster(self.turn);
          self.removeFromSearchCluster(self.B[self.aspiredIndex].value);
          //this.socket.emit('message', ("Sorry, I need to revisit our previous value " + self.B[self.aspiredIndex].value));
          backToBlack[self.B[self.aspiredIndex].name] = null;
          self.B.pop();
          
          self.temp = self.findValue();
        }

        if (self.temp){//if it find a value with the current term
          //add the offer to B
          self.B[self.aspiredIndex] = {};
          self.B[self.aspiredIndex].name = self.gole;
          self.B[self.aspiredIndex].value = self.temp.bid[self.gole];
          self.aspiredIndex++;
          
          for (var i = 0; i< self.A.length; i++){
            if (self.A[i] == issue){
              self.A.splice(i, 1);
              continue; 
            }
          }
          for (i in backToBlack)
              if (i == self.gole)
                delete backToBlack[i];
          this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});

          //this.socket.emit('message', 'Can I propose the following counter-offer?');
          console.log("find an acceptable bid with the current term")
          console.dir(self.temp);
          console.log("------------------------------------------------------------");
          console.dir(tempb);
          console.log("------------------------------------------------------------");
          console.dir(self.B);
          console.log("************** self.B **************");
          console.log("AGENT OFFER SOMETHING ELSE!");
          console.log("------------------------------------------------------------");
          //console.log(self.gole + self.temp.bid[self.gole]);
          var goleR = {}
          goleR[self.gole] = self.temp.bid[self.gole];
          return (goleR);
        }
      }

  },

  removeFromSearchCluster: function (value){
    var self = this;
    //console.log(self.searchCluster.length + "$#$#$#$#$");
    for (i = 0; i < self.searchCluster.length; i++){
      var exist = false;
      for (val in self.searchCluster[i].bid){
        if (self.searchCluster[i].bid[val] == value)
          exist = true;
      }
      if (exist){
        self.searchCluster.splice(i, 1);
        i--;
      }
    }
    //console.dir(self.searchCluster);
    //console.log(self.searchCluster.length + "$#$#$#$#$");
    
  },

  calcRejectionProbabilities: function(name, prevOfferValue, prevTypeProbability){
    var self = this;
    var offerValue = 0;
    var offerProbability = 0;
    var offerSum = 0;
    for (var i = 1; i<=self.numOfBids ; i++){
      if (self.initBids[i]['utilOpp'+name] >= prevOfferValue){
        offerValue = Math.exp(self.initBids[i]['utilOpp'+name] * PRECISION_VALUE);
        offerProbability = offerValue/ self['sumUtilOpp'+name];
        offerSum += (offerProbability * prevTypeProbability);
      }
    }
    return offerSum;
  },


  checkBid: function (offer, turn){
    var self = this;

    var len = 0;
    for (var o in offer) {
        len++;
    }

    if (len ==  self.issuesLength) {// check if the bid is full.
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
          return ({"Accept" : offer});
      else
          return ({"Reject" : offer});
    }
    else{ 
      /*//make the offer to be full for get the utility
      var currUtil = self.makeFullOffer(offer);
      self.checkOpponent(turn, currUtil);
      console.log("CURRENT OPPONENT " +self.posibleOpponent[self.currOpponent].nikName);
      console.log("############################################");
      
      var myUtility = self['myUtilityShort'].getUtilityWithDiscount(currUtil, turn);*/


      //new NegoChatAgent
      //if the offer was negotiate before teke it out from B.
      for (issue in offer){
        for (var i = 0; i< self.B.length; i++){
           if (self.B[i].name == issue){
              self.B.splice(i, 1); 
              self.aspiredIndex--;
              continue;
           }
        }
      }
      // when the opponent offer something, the agent looking for an acceptable bid in the search cluster.
      self.temp = self.findValueWithOffer(offer); 
      console.dir(offer);
      console.log("opponent offer this!");
      console.log("------------------------------------------------------------");
      if (self.temp){
        for(issue in offer){
          for (var i = 0; i< self.A.length; i++){
            if (self.A[i] == issue){
              self.A.splice(i, 1); 
              continue;
            }
          }
          self.B[self.aspiredIndex] = {};
          self.B[self.aspiredIndex].name = issue;
          self.B[self.aspiredIndex].value = offer[issue];
          self.aspiredIndex++;          
        }
        console.dir(offer);
        console.log("OPPONENT OFFER ACCEPTED!");
        console.log("------------------------------------------------------------");
        console.log("current agreement: ");
        console.dir(self.B);
        console.log("------------------------------------------------------------");
        console.log("left to agree on: ");
        console.dir(self.A);
        console.log("------------------------------------------------------------");        
        return ({"Accept" : offer});
      }
      else{
        //this.socket.emit('message', 'Sorry, I can not do that Can I propose the following counter-offer?')
        //var oppWish = Object.keys(offer)[0]; //for now, if the opp wants several things the agent get reference only to the first thing he offer.
        var tempb = clone(self.B);  //keep the B copy
        var tempa = clone(self.A);  //keep the A copy
        //keep the value we take out of our agreement to turn them back to black in the menue
        var backToBlack = {};

        this.socket.emit('message', 'Sorry, I can not do that');
        while(self.B.length > 0 && !self.temp){
          console.log("couldn't find an acceptable bid with the current term")
          console.dir(self.B);
          console.dir(offer);
          console.log("------------------------------------------------------------");
          self.aspiredIndex--;
          self.recalculateSearchCluster(self.turn);
          // if the agent can not find an offer with the B rerm and the opponent offer he recalculate the search cluster
          //self.A.push(self.B[self.aspiredIndex].name);
          self.gole = self.B[self.aspiredIndex].name;
          self.removeFromSearchCluster(self.B[self.aspiredIndex].value);
          backToBlack[self.B[self.aspiredIndex].name] = null;
          //this.socket.emit('message', ('I am trying to come to your offer with other term of ' + self.B[self.aspiredIndex].name + ' than we agreed before'));
          //this.socket.emit('message', "if I will not find it acceptable we will be able to discudd it again");
          
          //put the last value they agreed on from B, remove all the offers with that value from the search cluster and pop it from B.
          self.B.pop();
          //looking for the offer with the current term in B
          self.temp = self.findValueWithOffer(offer);
          if (self.temp){ //if it find a value with the current term
            for(issue in offer){ //if the issue that the opponent offer exsist in A delete it from there
              for (var i = 0; i< self.A.length; i++){
                if (self.A[i] == issue){
                  self.A.splice(i, 1);
                  continue; 
                }
              } //add the offer to B
              self.B[self.aspiredIndex] = {};
              self.B[self.aspiredIndex].name = issue;
              self.B[self.aspiredIndex].value = offer[issue];
              self.aspiredIndex++;
              
            }
            this.socket.emit('message', 'Can I propose the following counter-offer?');
            console.log("find an acceptable bid with the current term")
            console.dir(self.temp);
            console.log("------------------------------------------------------------");
            console.dir(tempb);
            console.log("------------------------------------------------------------");
            console.dir(self.B);
            console.log("************** self.B **************");
            console.log("OPPONENT OFFER DENIED OFFERING SOMETHING ELSE!");
            console.log("------------------------------------------------------------");
            //console.log(self.gole + self.temp.bid[self.gole]);
            
            var goleR = offer;
            goleR[self.gole] = self.temp.bid[self.gole];
            //console.log(self.temp);
            // add the gole that we set lower to B
            self.B[self.aspiredIndex] = {};
            self.B[self.aspiredIndex].name = self.gole;
            self.B[self.aspiredIndex].value = self.temp.bid[self.gole];
            self.aspiredIndex++;
            for (i in backToBlack)
              if (i == self.gole)
                delete backToBlack[i];
            this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
            return ({"AcceptOffer" : self.B });
          }
          else // if there is any offer of the current term of B and the opponent offer push the gole to A and keep looking.
            var isInA = false;
            for (var i=0; i < self.A.length; i++){
              if (self.A == self.gole)
                isInA = true;
            }
            if(!isInA)
              self.A.push(self.gole);
        }
        //if there is no way the agent agreed to an offer, he put back B to what it wes and reject the offer.
        if (self.B.length == 0 && !self.temp){
          console.dir(tempb);
          console.log("------------------------------------------------------------");
          console.dir(self.B);
          console.log("************** self.B **************");
          console.log("OPPONENT OFFER DENIED!");
          console.log("------------------------------------------------------------");
          self.B = clone(tempb);
          self.A = clone(tempa);
          self.aspiredIndex = self.B.length;
          console.dir(self.B);
          console.log("------------------------------------------------------------");
          console.dir(tempb);
          console.log("************** self.B **************");
          console.log("OPPONENT OFFER DENIED - GO BACK TO THE WAY IT WAS!");
          console.log("------------------------------------------------------------");
          return ({"Reject" : offer});
        }
      }
   }
},

  findCurrBid: function(offer){
    for( var i = 1; i <= this.numOfBids; i++){
      //console.log(this.initBids[i].bid);
      //console.log(offer);
      var checkEachBid = true;
      for (issue in this.initBids[i].bid){
        if (offer[issue.toLowerCase()] != undefined){
          if ((offer[issue.toLowerCase()]).toLowerCase() != (this.initBids[i].bid[issue]).toLowerCase())
              checkEachBid = false;
        }
        else{
          if ((offer[issue]).toLowerCase() != (this.initBids[i].bid[issue]).toLowerCase())
              checkEachBid = false;
        }
      }
      if (checkEachBid){
        console.log(i);
        return i;
      }
    }
  },

  checkOpponent: function(turn, offer){
   
    var self = this;
    
    var sumProbabilities = 0;
    var curr = 0;  
    var prevTypeProbability = 0;
    var prevOfferValue = 0;
    var prevOfferProbability = 0;
    var updatedTypeProbability = 0;

      for (var i = 0; i < self.posibleOpponent.length; i++){ 
        var name = self.posibleOpponent[i].nikName; //the nik name of current opponent
        prevTypeProbability = self.posibleOpponent[i].probability;
        var ut = self['oppUtility'+name].getUtility(offer);
        prevOfferValue = self['oppUtility'+name].getUtilityWithDiscount(ut, turn); //calculate the utility with discount.
        prevOfferValue = Math.exp(prevOfferValue * PRECISION_VALUE);
        prevOfferProbability = prevOfferValue / self['sumUtilOpp'+name] //calculate the luc number of the current offer
        sumProbabilities += prevOfferProbability * prevTypeProbability; // self.posibleOpponent[i].calculateCurrOpp(luc); // add the numerator of the calculation of the probability
      } 

      for (var i = 0; i < self.posibleOpponent.length; i++){

        var name = self.posibleOpponent[i].nikName; //the nik name of current opponent
        prevTypeProbability = self.posibleOpponent[i].probability;
        var ut = self['oppUtility'+name].getUtility(offer);
        prevOfferValue = self['oppUtility'+name].getUtilityWithDiscount(ut, turn); //calculate the utility with discount.
        prevOfferValue = Math.exp(prevOfferValue * PRECISION_VALUE);
        prevOfferProbability = prevOfferValue / self['sumUtilOpp'+name] //calculate the luc number of the current offer

        updatedTypeProbability = (prevOfferProbability * prevTypeProbability) / sumProbabilities;

        self.posibleOpponent[i].probability =  updatedTypeProbability;//the new probability
       }
       self.currOpponent  = 0;
       for (var i = 0; i < self.posibleOpponent.length; i++){
        console.log(self.posibleOpponent[i].nikName);
        console.log(self.posibleOpponent[i].probability);
        if (self.posibleOpponent[i].probability > self.posibleOpponent[self.currOpponent].probability){
          self.currOpponent = i;
          self.nik = self.posibleOpponent[i].nikName;
        }
      }
  },

  makeFullOffer: function(offer){
    var self = this;
    //var currMyUtil = this.myUtilityShort.getUtility(offer);
    var currOppUtil = this['oppUtility'+ self.nik].getUtility(offer);
    return currOppUtil;
     
  },

  enterEsperationScale: function(A, issues){
    console.dir(issues);


  }
}

function clone(obj){
    if(obj == null || typeof(obj) != 'object'){
      //console.log("return the same object")
      return obj;
    }
    else{

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    //console.log("return copy of the object")  
    return temp;
  }
}

function insertToBTemp(temp){

}