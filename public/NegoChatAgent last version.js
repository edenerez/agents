

module.exports = NegoChatAgent;
 var logs = require('../logs');
 var fs = require('fs');
 var nl = require('os').EOL;

var Analysis = require('../analysis/analysis');
var UtilitySpace = require('../analysis/utilitySpace');
var logger = require('../logger')
var OpponentData = require('../analysis/opponentData');
var PRECISION_VALUE = 0.3  // used in order to scale utilities and make them positive



function NegoChatAgent(domain, role, oppRole, gameid) {
  this.domain = domain;
  this.role = role;
  console.log(role +" my role")
  console.log(oppRole+ " OPP role")
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
  this.constForThreshold = 220; //for now i subtracts that value from the agent threshold - should be another value for that
  //this.A = [];
  this.status;
  //his.A = this.myUtilityShort.enterEsperationScale();
  this.A = readAspirationFile();
  console.log(this.A);
  this.B = [];
  this.B_temp = [];
  this.discuss = [];
  this.turn;
  this.gameid = gameid;
  this.status;
  
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
    if (self.oppRole == 'Employer'){
      self.posibleOpponent.push(new OpponentData('B', 'ShortTerm', 'Short'));
      self.posibleOpponent.push(new OpponentData('B', 'Compromise', 'Comp'));
      self.posibleOpponent.push(new OpponentData('B', 'LongTerm', 'Long'));
    }
    else {
      self.posibleOpponent.push(new OpponentData('A', 'ShortTerm', 'Short'));
      self.posibleOpponent.push(new OpponentData('A', 'Compromise', 'Comp'));
      self.posibleOpponent.push(new OpponentData('A', 'LongTerm', 'Long'));
    }


    self.currOpponent = 2;//Math.round(Math.random() * 2);
    self.nik = self.posibleOpponent[self.currOpponent].nikName;
    for (var i = 0; i < self.posibleOpponent.length; i++){
      self.posibleOpponent[i].probability = 1/self.posibleOpponent.length;
      self.posibleOpponent[i].calcProbability = 1/self.posibleOpponent.length;
    }
    console.log("opponent type is " +self.nik);
  },


  pickBid: function (turn){

    var self = this;
    self.B_temp = clone(self.B);
    self.turn = turn;

    if (self.A.length > 0){ //if A.length is bigger than 0 it is mean that there are more issues to discuss on.
      logs.writeJsonLogGame(self.gameid, self.status, "offer the first value of ", self.A);
      //console.log("***** offer the first value of " + self.A + "*****");
      //console.log("---------------------------------------------------");
      //this.recalculateSearchCluster(turn);
      self.gole = self.A[0];//the first issue to discuss on
      
      
      var goleR = self.checkIfExist();
      if (goleR){
        var isInDiscuss = false;
        for(var i = 0; i < self.discuss.length; i++){
          if(self.discuss[i].name == self.gole){
            isInDiscuss = true;
            if (self.discuss[i].lastOffer != goleR[self.gole])
              self.discuss[i].lastOffer = goleR[self.gole]
          }
        }
        if(!isInDiscuss){
          var pushToDiscuss = {};
          pushToDiscuss.name = self.gole;
          pushToDiscuss.lastOffer = goleR[self.gole];
          self.discuss.push(pushToDiscuss);
        }
        return (goleR);
      }
      else
        return;
    }
    else{
      var checkIfDone = true;
      if(self.temp.bid){
        for (issue in self.temp.bid){
          if (!self.B[issue]){
            self.A.push(issue);
            checkIfDone = false;
          }
        }
      }
      if (checkIfDone)
        this.socket.emit('message', "I guess we discuss everything and we can sign the agreement");
      else{
        return;
      }
    }
  },

  checkIfExist: function(){
    var self = this;
    self.temp = self.findValue();
      if (self.temp){
        
        self.B_temp[self.B_temp.length] = {}
        self.B_temp[self.B_temp.length-1].name = self.gole;
        self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
        //come back later to here!!
        /*for (var i = 0; i < self.B.length; i++){
          self.btemp[self.B[i].name] = self.B[i].value;
        }
*/      
        //console.log("the agent's offer is" + self.gole + " "+ self.temp.bid[self.gole]);
        //console.log("---------------------------------------------------");
        var goleR = {}
        goleR[self.gole] = self.temp.bid[self.gole];
        logs.writeJsonLogGame(self.gameid, self.status, "the agent's offer is ", goleR);
        return (goleR);
      }
  },

  tryToCompromise: function(){
    var self = this;
    self.B_temp = clone(self.B);
    if (self.discuss.length > 0){
      self.gole = self.discuss[0].name;
      self.removeFromSearchCluster(self.discuss[0].lastOffer);// remove the current gole which the opponent rejected
      self.temp = self.findValue();  //try to find a bid without the gole the opponent reject               
      if (self.temp){
        for (var i = 0; i<self.B_temp.length; i++){
          if (self.B_temp[i].name == self.gole)
            self.B_temp[i].value = self.temp.bid[self.gole];
            
        }
        for (var i = 0; i<self.discuss.length; i++){
          if (self.discuss[i].name == self.gole)
            self.discuss.lastOffer = self.temp.bid[self.gole];
            
        }
        //console.log("the opponent want the agent to comromise and the agent's new offer is " +self.gole + " " + self.temp.bid[self.gole]);
        //console.log("---------------------------------------------------");
        var goleR = {}
        goleR[self.gole] = self.temp.bid[self.gole];
        for(var i = 0; i < self.discuss.length; i++){
          if(self.discuss[i].name == self.gole){
            if (self.discuss[i].lastOffer != goleR[self.gole])
              self.discuss[i].lastOffer = goleR[self.gole]
          }
        }
        //console.log("->->->->->->->->->->->->->->->->->->->->->->->->->");
        //console.log(JSON.stringify(goleR));
        logs.writeJsonLogGame(self.gameid, self.status, "the opponent want the agent to comromise and the agent's new offer is ", goleR);
        return (goleR);
      }
      else
        return;
    }
    else{
      return;

    }


  },


//when the user asks the agent "what the next bid " he brings the next offer 
  pickBidForYou: function(turn){
    var self = this;

    var isGoleInB = false;
    for(var i = 0; i<self.B.length; i++){
      if(self.B[i].name == self.gole)
        isGoleInB = true;
    }
    if (isGoleInB){
      var goleR = self.pickBid(turn);
      if (goleR){
         return (goleR);
      }

    }
    else{
      
      /*if(self.temp){
        self.removeFromSearchCluster(self.temp.bid[self.gole]);
        //console.log("  ------------  " +self.temp.bid[self.gole]+"  ------------  " +self.gole);
      }*/
      
      self.B_temp = clone(self.B);
      var goleR = self.checkIfExist();
      if (goleR){
        logs.writeJsonLogGame(self.gameid, self.status, "the opponent want the agent to pick and the agent's new offer is ", goleR);
        return (goleR);
      }
      else
        return;

    }
  },

  pickSpecificBidForYou: function(turn, issueToTalk){ // take care!
    var self = this;

    
    for(var i = 0; i<self.B.length; i++){
      if(self.B[i].name == issue){
        self.A.push(issue);
        self.B.splice(i, 1);
        i--;
      }

    }

    self.B_temp - clone(self.B);
    self.gole = issueToTalk;
    var goleR = self.checkIfExist();

    if (goleR){
      for(var i = 0; i < self.discuss.length; i++){
        if(self.discuss[i].name == self.gole){
          if (self.discuss[i].lastOffer != goleR[self.gole])
            self.discuss[i].lastOffer = goleR[self.gole]
        }
      }
      return (goleR); 
    }
    else{
      self.socket.emit('massage', "I suggest you offer something");
      return;

    }
  },

//when the user asks the agent "what the next issue to duscuss" he brings the next issue to discuss on 
  pickIssueForYou: function(turn){
      var self = this;

      var isGoleInB = false;
      for(var i = 0; i<self.B.length; i++){
        if(self.B[i].name == self.gole)
          isGoleInB = true;
      }
      if (isGoleInB){
         var a_t = self.A[0];
         self.socket.emit('message', "Let's talk about " + a_t );

      }
      else{
        self.socket.emit('message', "Let's talk about " + self.gole );

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

    if (!agentThreshold)
      agentThreshold = this.posibleOpponent[this.currOpponent].agentAcceptThersholds[Object.keys(this.posibleOpponent[this.currOpponent].agentAcceptThersholds).length-1];
    //console.log("agentThreshold --- " + agentThreshold);
    logs.writeJsonLogGame(self.gameid, self.status, "the agent threshold for the " + turn +"turn is ", agentThreshold);
    oppThreshold = agentThreshold - this.constForThreshold;
    self.searchCluster = [];
    var i = 0;
    for (bid in this.initBids){
      if (self.initBids[bid].utilMe > agentThreshold && self.initBids[bid]['utilOpp'+self.nik] > oppThreshold){
        self.searchCluster[i] = self.initBids[bid];
        
        //logs.writeJsonLogGame(turn, i, "bid", self.initBids[bid]);
        i++;
      }

    }
    console.log(i + "   $#$#$#$#$");
  },

  opponentAccepted: function (offer, turn){
    var self = this;

    var isGoleInB = false;
    for (var i = 0; i <self.B.length; i ++){
      if (self.B[i].name == self.gole)
        isGoleInB = true;
    }

    var isGoleInBtemp = false;
    for (var i = 0; i <self.B_temp.length; i ++){
      if (self.B_temp[i].name == self.gole)
        isGoleInBtemp = true;
    }

    //if (!isGoleInB && isGoleInBtemp){
      self.B = clone(self.B_temp);
    //}
    var colorAgreement = {};
    for (var j = 0; j < self.B.length; j++){
      colorAgreement[self.B[j].name] = self.B[j].value;
      for (var i = 0; i< self.A.length; i++){
        if (self.A[i] == self.B[j].name){
          self.A.splice(i, 1);
          i--;
        }
      }
      for (var i = 0; self.discuss.length <i; i++){
        if (self.discuss[i] == self.B[j].name){
          self.discuss.splice(i, 1);
          i--;
        }
      }
    }

    self.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: colorAgreement, role: self.role}); 
    var bobj = convertBToObject(self.B)
    self.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: bobj, role: self.role});
    logs.writeJsonLogGame(self.gameid, self.status, "the opponent agreed on the agent's offer. the current agreement is: ", self.B);
    logs.writeJsonLogGame(self.gameid, self.status, "BASED ON THAT BID ", self.temp);
    //console.log("the opponent agreed on the agent's offer. the current agreement is:")
    //console.dir(self.B);
    logs.writeJsonLogGame(self.gameid, self.status, "left to agree on: ", self.A);
    //console.log("left to agree on: " + self.A)
    //console.log("---------------------------------------------------");
    
    if (self.A.length == 0){
      return "done";
    }
    else{
      var offerWithAccept = self.pickBidForYou(self.turn);
      var bobj = convertBToObject(self.B)
      self.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: bobj, role: self.role});
      if (offerWithAccept)
        return ({"Offer" : offerWithAccept});
      else
        return;
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

    if (typeof(offer) != "object"){
      console.log(offer +" was rejected");
      var tempOffer = {};
      var exist = false;
      for(var i=0; i<self.B.length; i++){
        if (self.B[i].name == offer){
          exist = true;
          tempOffer[offer] = self.B[i].value;
          self.B.splice(i, 1);
          i--;
        }
      }
      if (!exist){
        for(var i=0; i<self.B_temp.length; i++){
          if (self.B_temp[i].name == offer){
            exist = true;
            tempOffer[offer] = self.B_temp[i].value;
            self.B.splice(i, 1);
            i--;
          }
        }
      }

      if( !exist){
        self.socket.emit('message', "What do you reject?");
        return;
      }
     
      if (!self.A.hasOwnProperty(offer)) 
        self.A.push(offer);    
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
      //console.log(self.posibleOpponent[i].nikName);
      //console.log(self.posibleOpponent[i].probability);
      if (self.posibleOpponent[i].probability > self.posibleOpponent[self.currOpponent].probability){
        self.currOpponent = i;
        self.nik = self.posibleOpponent[i].nikName;
      }
    }


    //all above is calculation of the opponent - here is what should bw done for that NegoChatAgent:
    console.log(self.searchCluster.length + " NUMBERS OF OFFER EXIST")
    self.removeFromSearchCluster(offer[self.gole]);// remove the current gole which the opponent rejected
    console.log(self.searchCluster.length + " NUMBERS OF OFFER LEFTED")
    logs.writeJsonLogGame(self.gameid, self.status, "the agent REJECT THIS OFFER ", offer);
    //console.log("***************************************************");
    //console.log("********************  REJECT THIS OFFER  ********************");
    //console.log(offer[self.gole]);
    //console.log("***************************************************");
    //console.log("***************************************************");
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

        //console.log("the opponent rejected my offer and the agent's new offer is " +self.gole + " " + self.temp.bid[self.gole]);
        //console.log("---------------------------------------------------");
        var goleR = {}
        goleR[self.gole] = self.temp.bid[self.gole];

        logs.writeJsonLogGame(self.gameid, self.status, "the opponent rejected my offer and the agent's new offer is ", goleR);

        for(var i = 0; i < self.discuss.length; i++){
          if(self.discuss[i].name == self.gole){
            if (self.discuss[i].lastOffer != goleR[self.gole])
              self.discuss[i].lastOffer = goleR[self.gole]
          }
        }
        return (goleR);
      }
      else{
        var tempb = clone(self.B);  //keep the B copy
        var tempa = clone(self.A);  //keep the A copy
         //keep the value we take out of our agreement to turn them back to black in the menue
        var backToBlack = {};
 
        while (self.B.length > 0 && !self.temp){

          logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term ", self.B);
          logs.writeJsonLogGame(self.gameid, self.status, "AND WITH THE VALUE THAT THE OPPONENT REJECT! ", self.gole);
          //console.log("couldn't find an acceptable bid with the current term")
          //console.dir(self.B);
          //console.dir('AND WITH THE VALUE OF '+ self.gole + " THAT THE OPPONENT REJECT!");
          //console.log("------------------------------------------------------------");
          
          var isGoleInA = false;
          for (var i = 0; i <self.A.length; i ++){
            if (self.A[i] == self.gole)
              isGoleInA = true;
          }
          if (!isGoleInA){
            self.A.push(self.gole);
          }
          
          self.gole = self.B[self.B.length-1].name;
          //self.recalculateSearchCluster(self.turn);
          self.removeFromSearchCluster(self.B[self.B.length-1].value);
          //this.socket.emit('message', ("Sorry, I need to revisit our previous value " + self.B[self.aspiredIndex].value));
          backToBlack[self.B[self.B.length-1].name] = null;
          self.B.pop();
          self.B_temp = clone(self.B);
          self.temp = self.findValue();
          

        if (self.temp){//if it find a value with the current term
          //add the offer to B

          
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
          
          /*for (var i = 0; i< self.A.length; i++){
            if (self.A[i] == issue){
              self.A.splice(i, 1);
              continue; 
            }
          }*/
          for (i in backToBlack)
              if (i == self.gole)
                delete backToBlack[i];
          //this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});

          //this.socket.emit('message', 'Can I propose the following counter-offer?');
          //console.log("find an acceptable bid with the current term")
          //console.dir(self.temp);
          //console.log("------------------------------------------------------------");
          //console.dir(tempb);
          //console.log("------------------------------------------------------------");
          //console.dir(self.B);
          //console.log("************** self.B **************");
          //console.dir(self.B_temp);
          //console.log("************** self.B_temp **************");
          //console.log("AGENT OFFER SOMETHING ELSE!");
          //console.log("------------------------------------------------------------");
          //console.log(self.gole + self.temp.bid[self.gole]);
          var goleR = convertBToObject(self.B_temp)

          logs.writeJsonLogGame(self.gameid, self.status, "find an acceptable bid with the current term ", self.B);
          logs.writeJsonLogGame(self.gameid, self.status, "AGENT OFFER SOMETHING ELSE!", self.B_temp);

          //goleR[self.gole] = self.temp.bid[self.gole];
          return (goleR);
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
      if (self.B.length == 0 && !self.temp){
        self.A = clone(tempa);
        self.B = clone(tempb);
        self.B_temp = clone(tempb);
        self.socket.emit('message', "Just a minute, I need to think a bit.");
        return;

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
        if (self.B.length > 0 && !exist){
         for(var j=0; j< self.B.length; j++){
          if (val == self.B[j].name)
            if (self.searchCluster[i].bid[val] != self.B[j].value)
              exist = false;
          }
        }
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

      if (doubleBid(offer)){
        //console.log("-----------double issue in offer!!--------------");
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

      // when the opponent offer something, the agent looking for an acceptable bid in the search cluster.
      console.log("when the opp suggest an offer in the temp there is:");
      console.dir(self.temp);


      self.temp = self.findValueWithOffer(offer); 
      console.dir(offer);
      logs.writeJsonLogGame(self.gameid, self.status, "opponent offer this! ", offer);
      //console.log("opponent offer this!");
      //console.log("------------------------------------------------------------");
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
        /*console.dir(offer);
        console.log("OPPONENT OFFER ACCEPTED!");
        console.log("------------------------------------------------------------");
        console.log("current agreement: ");
        console.dir(self.B);
        console.log("------------------------------------------------------------");
        console.log("left to agree on: ");
        console.dir(self.A);
        console.log("------------------------------------------------------------");   */     
        
        logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER ACCEPTED! ", offer);
        logs.writeJsonLogGame(self.gameid, self.status, "current agreement: ", self.B);
        logs.writeJsonLogGame(self.gameid, self.status, "left to agree on: ", self.A);
        
        var offerWithAccept = self.pickBidForYou(self.turn);
        var bobj = convertBToObject(self.B)
        self.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: bobj, role: self.role});
        if (offerWithAccept)
          return ({"Accept" : offer, "Offer" : offerWithAccept, conjunction: "and"});
        else
           return ({"Accept" : offer});
      }
      else{
        //var lastBid = self.temp.bid; //the last bid the agent offer for suggerst double offer in the end.

        //this.socket.emit('message', 'Sorry, I can not do that Can I propose the following counter-offer?')
        //var oppWish = Object.keys(offer)[0]; //for now, if the opp wants several things the agent get reference only to the first thing he offer.
        var tempb = clone(self.B);  //keep the B copy
        var tempa = clone(self.A);  //keep the A copy
        //keep the value we take out of our agreement to turn them back to black in the menue
        var backToBlack = {};
        var theOriginalOffer = clone(offer);
        //self.socket.emit('message', 'Sorry, I can not do that');
        
        logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term ", self.B);
        logs.writeJsonLogGame(self.gameid, self.status, "and ", offer);
        //console.log("couldn't find an acceptable bid with the current term")
        //console.dir(self.B);
        //console.dir(offer);
        //console.log("------------------------------------------------------------");
        self.recalculateSearchCluster(self.turn);
        for (issue in theOriginalOffer){
          self.removeFromSearchCluster(theOriginalOffer[issue]);
        }
        self.temp = self.findValueWithOffer();
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
            
          //console.log(self.gole + self.temp.bid[self.gole]);
          //console.log(self.temp);
          // add the gole that we set lower to B
                
          //this.socket.emit('message', 'Can I propose the following counter-offer?');
          logs.writeJsonLogGame(self.gameid, self.status, "find another acceptable bid with the current term ", self.temp);
          logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER DENIED OFFERING SOMETHING ELSE! ", self.B_temp);
     
          //this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
          self.B = clone(tempb);
          //self.A - clone(tempa);
          //otherBidOption[self.gole] = self.temp.bid[self.gole];
          logs.writeJsonLogGame(self.gameid, self.status, "the 'accept' part ", offer);
          logs.writeJsonLogGame(self.gameid, self.status, "the 'offer' part ", offerToAccept);
          return ({"Reject" : theOriginalOffer,"Offer" : goleR} )

        }
        else{
          // if the agent can not find an offer with the B rerm and the opponent offer he recalculate the search cluster
          //self.A.push(self.B[self.aspiredIndex].name);
          while(self.B.length > 0 && !self.temp){

            logs.writeJsonLogGame(self.gameid, self.status, "couldn't find an acceptable bid with the current term ", self.B);
            logs.writeJsonLogGame(self.gameid, self.status, "and ", offer);
          
            //self.recalculateSearchCluster(self.turn);
            for (issue in theOriginalOffer){
              self.removeFromSearchCluster(theOriginalOffer[issue]);
            }

            self.gole = self.B[self.B.length-1].name;
            self.removeFromSearchCluster(self.B[self.B.length-1].value);
            backToBlack[self.B[self.B.length-1].name] = null;
            //this.socket.emit('message', ('I am trying to come to your offer with other term of ' + self.B[self.aspiredIndex].name + ' than we agreed before'));
            //this.socket.emit('message', "if I will not find it acceptable we will be able to discudd it again");
          
            //put the last value they agreed on from B, remove all the offers with that value from the search cluster and pop it from B.
            self.B.pop();
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
            
            //console.log(self.gole + self.temp.bid[self.gole]);
            
            var goleR = offer;

            for(var i = 0; i < self.discuss.length; i++){
              if(self.discuss[i].name == self.gole){
                if (self.discuss[i].lastOffer != goleR[self.gole])
                  self.discuss[i].lastOffer = goleR[self.gole]
              }
            }
            goleR[self.gole] = self.temp.bid[self.gole];
            //console.log(self.temp);
            // add the gole that we set lower to B
            self.B_temp[self.B_temp.length] = {};
            self.B_temp[self.B_temp.length-1].name = self.gole;
            self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
          

            //this.socket.emit('message', 'Can I propose the following counter-offer?');
            logs.writeJsonLogGame(self.gameid, self.status, "find an acceptable bid with the current term ", self.temp);
            logs.writeJsonLogGame(self.gameid, self.status, "OPPONENT OFFER DENIED OFFERING SOMETHING ELSE! ", self.B_temp);
           
            for (i in backToBlack)
              if (i == self.gole)
                delete backToBlack[i];
            //this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
            self.B = clone(tempb);
            //self.A - clone(tempa);
             var offerToAccept = clone(self.B_temp);
             //var otherBidOption = {};
            
            for(var i = 0; i< offerToAccept.length; i++){
              for(issue in theOriginalOffer){
                //otherBidOption[issue] = lastBid[issue];
                if (offerToAccept[i].name == issue){
                  offerToAccept.splice(i,1);
                  i--;
                }
              }
            }

            //otherBidOption[self.gole] = self.temp.bid[self.gole];

            logs.writeJsonLogGame(self.gameid, self.status, "the 'accept' part ", offer);
            logs.writeJsonLogGame(self.gameid, self.status, "the 'offer' part ", offerToAccept);
            
            return ({"Accept" : theOriginalOffer,"Offer" : convertBToObject(offerToAccept), conjunction: "but"} )
            //return ({"AcceptOffer" : convertBToObject(self.B_temp)});
          }
          // if there isn't any offer of the current term of B and the opponent offer push the gole to A and keep looking.
        }
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
        //console.log(i);
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

  pikBestOffer: function(offer){
    var self = this;
    var offer1 = {};
    var offer2 = {};
    for (issue in offer){
      if (typeof(offer[issue]) == "object"){
        offer1[issue] = (offer[issue])[0];
        offer2[issue] = (offer[issue])[1];
      }
      else{
        offer1[issue] = (offer[issue]);
        offer2[issue] = (offer[issue]);
      }

    }
    if(self.myUtilityShort.getPartialUtility(offer1) > self.myUtilityShort.getPartialUtility(offer2))
      return offer1;
    else
      return offer2;
  },

  makeFullOffer: function(offer){
    var self = this;
    //var currMyUtil = this.myUtilityShort.getUtility(offer);
    var currOppUtil = this['oppUtility'+ self.nik].getUtility(offer);
    return currOppUtil;
     
  },


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

function convertBToObject(temp){
  var tb = {};
  for (var i = 0; i<temp.length; i++){
    tb[temp[i].name] = temp[i].value;

  }
  return tb;

}

function doubleBid(offer){
  var isDouble = false;
  for (issue in offer){
    if (typeof(offer[issue]) == "object")
      isDouble = true;
  }
  return isDouble;
}

function readAspirationFile (){

  var some = new Object();
  var f = true;
  var j;
  var lines = fs.readFileSync('./domains/JobCandiate/aspiration.xml', 'utf8');//, function (err,data){
  lines = lines.split(nl);
  return (lines);
}

