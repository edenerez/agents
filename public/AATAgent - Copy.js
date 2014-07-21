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
              for (var i = 0; i< self.A.length; i++){
                if (self.A[i] == issue){
                  self.A.splice(i, 1);
                  continue; 
                }
              } //add the offer to B_temp
              self.B_temp[self.B_temp.length] = {};
              self.B_temp[self.B_temp.length-1].name = issue;
              self.B_temp[self.B_temp.length-1].value = offer[issue];
              self.aspiredIndex++;
              
            }
            
            //console.log(self.gole + self.temp.bid[self.gole]);
            
            var goleR = offer;
            goleR[self.gole] = self.temp.bid[self.gole];
            //console.log(self.temp);
            // add the gole that we set lower to B
            self.B_temp[self.B_temp.length] = {};
            self.B_temp[self.B_temp.length-1].name = self.gole;
            self.B_temp[self.B_temp.length-1].value = self.temp.bid[self.gole];
          

            this.socket.emit('message', 'Can I propose the following counter-offer?');
            console.log("find an acceptable bid with the current term")
            console.dir(self.temp);
            console.log("------------------------------------------------------------");
            console.dir(tempb);
            console.log("------------------------------------------------------------");
            console.dir(self.B_temp);
            console.log("************** self.B **************");
            console.log("OPPONENT OFFER DENIED OFFERING SOMETHING ELSE!");
            console.log("------------------------------------------------------------");


            self.aspiredIndex++;
            for (i in backToBlack)
              if (i == self.gole)
                delete backToBlack[i];
            this.socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: backToBlack, role: this.role});  
            self.B = clone(tempb);
            self.A - clone(tempa);
            return ({"AcceptOffer" : self.B_temp});
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
          self.B_temp = clone(tempb);
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