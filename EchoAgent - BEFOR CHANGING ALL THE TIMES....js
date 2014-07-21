
/**
 * Other : Osnat Drain - osnatairy@gmail.com
 * Help with everything : Erel Segal Halevi - erelsgl@gmail.com
 * Initialize a new agent. 
 * @param socket - a socket.io client that this agent will use to connect to the negotiation server.
 */

var util = require('util');

var ACCEPT = 5000;
var REJECT = 5000;
var NO_COMMENT = 5000;

exports.Agent = function (name, agent, socket, role, gametype) {
  	var role = role;
	var agent = agent;
	var userid = this.userid = name + new Date().toISOString();
	var myLastBid;
	var oppLastBid;
	var curSratus;
	var gameid = gameid;
	var curTurn = 0;
	var gameIsOn = false;
	var agreed = false;
	agent.socket = socket;
	
	socket.on('connect', function () { 
		console.log("Hi, I am "+userid+", and I just connected to the negotiation server!" + gametype);
	});

	socket.on('status',function (status) { 
		if ((status.value == "0:00") || (!gameIsOn)){
			//socket.emit('EndGame');
			//socket.disconnect();
		}
		//console.log("The status changed: "+JSON.stringify(status));
		curStatus = status;
	});

	socket.on("EndGame", function(){
		console.log("END-GAME")
   		socket.emit("giveMeMyReservationUtility");
   		socket.disconnect();
    });

	socket.on('EndTurn', function (turn) { //אנו מניחים שהסכן שולח הצעה אחת בתור בתחילת התור (לאחר 4 שניות)
		if (!agreed && curTurn !== turn){
			setTimeout(function(){
				myLastBid = agent.pickBid(turn);
				socket.emit('negoactions', {'Offer' :myLastBid});
				socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: myLastBid, role: role});
			},4000);
			curTurn = turn;
			console.log("A turn has ended: "+turn);
		}
	});

	socket.on('announcement', function (announcement) { 
		if (announcement.action == 'Connect')
			gameIsOn = true;
		if (announcement.action == 'Disconnect'){
			console.log("bey bey! :)");
			gameIsOn = false;		
		}
		//console.log("Something happened: "+JSON.stringify(announcement));

	});


	socket.on('negoactions', function (actions) { 
		console.log("The opponent did these negotiation actions: "+JSON.stringify(actions));
		console.log("-------------------------------------------");
		var newOppBid = {};
		if (actions.hasOwnProperty('Reject')){ // the opponent reject the agent's offer
			if (myLastBid==null){ 
					socket.emit('message', "What do you reject?");

			}
			else{
				myLastBid = agent.opponentRejected(myLastBid, curTurn);
				if(myLastBid){
					socket.emit('negoactions', {'Offer' :myLastBid});
					socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: myLastBid, role: role});
					return;
				}
				else{
					socket.emit('message', "Just a minute, I need to think a bit.");
					return;

				}
			}



		}
		if (actions.hasOwnProperty('Query')){
			switch (actions.Query) {
				case "bid":{
					myLastBid = agent.pickBidForYou(curTurn);
					socket.emit('negoactions', {'Offer' :myLastBid});
					socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: myLastBid, role: role});
					
					console.log('  QUERY bid');
					break;
				}
				case "issues":{
					amyLastBid = agent.pickIssueForYou(curTurn);
					console.log('  QUERY issues');
					break;
				}
				case "compromise":{
					console.log('  QUERY compromise');
					break;
				}

			}
		
		}

		if (actions.hasOwnProperty('Accept')){ // the opponent accept the agent's offer
			if (myLastBid==null){ 
				socket.emit('message', "What do you accept?");
				console.error("What do you accept? myLastBid is null");
			}
			else{
				var issueName = actions.Accept
				if (issueName == "previous"){
					util._extend(newOppBid, myLastBid);
				}
				else {
					if (!(issueName instanceof Array)){
						issueName = [issueName];
						//console.log(issueName);
					}

					for(var i = 0; i < issueName.length; i ++){
						if (!(issueName[i] in myLastBid)) {
							socket.emit('message', "How can you accept my offer about '"+issueName[i]+"'. when I even haven't offered it yet?");
							console.error("How can you accept my offer about '"+issueName[i]+"'. when I even haven't offered it yet?")
						} else {
							newOppBid[issueName[i]]=myLastBid[issueName[i]];
						}
					}
				}
			}
		}

		if (actions.hasOwnProperty('Insist')){ // come as array and not as object - change it if it array do it else make it array. same in the accept
			if (oppLastBid==null){  //add the loop of the accept her too after I'll add the check of the arrays
					socket.emit('message', "What do you insist?");
			}
			else{
				var issueName = actions.Insist
				if (issueName == "previous"){
					util._extend(newOppBid, oppLastBid);
				}
				else {
					if (!(issueName instanceof Array)){
						issueName = [issueName];
						//console.log(issueName);
					}

					for(var i = 0; i < issueName.length; i ++){
						if (!(issueName[i] in oppLastBid)) {
							socket.emit('message', "How can you insist my offer about '"+issueName[i]+"'. when you even haven't offered it yet?");
							console.error("How can you inssit my offer about '"+issueName[i]+"'. when you even haven't offered it yet?")
						} else {
							newOppBid[issueName[i]]=oppLastBid[issueName[i]];
						}
					}
				}				
				//util._extend(newOppBid, oppLastBid);
			}
			
		}

		if (actions.hasOwnProperty('Append')){ // come as array and not as object - change it if it array do it else make it array. same in the accept
			if (oppLastBid==null){  //add the loop of the accept her too after I'll add the check of the arrays
					socket.emit('message', "What do you appand?");
			}
			else{
				var issueName = actions.Append
				if (issueName == "previous"){
					util._extend(newOppBid, oppLastBid);
				}
			}
		}

		if (actions.hasOwnProperty('Offer')){ // 'Offer in actions'
			util._extend(newOppBid, actions.Offer);
		}

		if (actions.hasOwnProperty('Greet')){ 
			console.log("The agent greet the opponent HI!");
			socket.emit('negoactions', {'Greet': true});
		}

		if (Object.keys(newOppBid).length==0) {  // only greet
			return;
		} else {
			var equal = true;
			for (issue in myLastBid){
				if (myLastBid[issue] != newOppBid[issue])
					equal = false;
			}
			if (equal) { // full accept
				var accept = agent.opponentAccepted(myLastBid, curTurn);
				if (!accept)
					socket.emit('message', "I'm happy that you accept.");
				else{
					socket.emit('message', "I'm happy that you accept. We can sign the agreement now.");
					agreed = true;
				}
			} 
			else {  // partial accept and/or new offers
				agentReplyAction = agent.checkBid(newOppBid, curTurn);
				oppLastBid = newOppBid;
				if (agentReplyAction){ 
					if (agentReplyAction.hasOwnProperty('Accept')){ //the agent accept the opponent's offer
						socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: oppLastBid, role: role});
						//agreed = true;
					}
					if (agentReplyAction.hasOwnProperty('AcceptOffer')){ //the agent accept the opponent's offer
						socket.emit('enterAgentBidToMapRoleToMapIssueToValue', {bid: oppLastBid, role: role});
						
						//console.dir(agentReplyAction.AcceptOffer); console.log("^^^^^^^^^^^^^^^^^^^^^^^");
						//agreed = true;
						myLastBid = agentReplyAction.AcceptOffer;
   						Object.defineProperty(agentReplyAction, 'Accept',
       					Object.getOwnPropertyDescriptor(agentReplyAction, 'AcceptOffer'));
  						delete agentReplyAction['AcceptOffer'];
					}
					socket.emit('negoactions', agentReplyAction);
				}
				
			}
		}
					
	});
	
	socket.on('sign', function (data) { //the agent allwas sign after the opponent so we won't get to infinit loop.
		var proposer = data.id + (data.you? " (You)": "");
		console.log("Signing the following agreement: "+ proposer +" " +JSON.stringify(data.agreement))
		/*partiesThatSigned[proposer] = true;
		if (Object.keys(partiesThatSigned).length>=2)
			bye();
			
		addDataToHistoryTable({			
			proposerClass: data.id + (data.you? " You": " Partner"),
			proposer: proposer,
			action: "Sign",
			util: "",
			
			answered: "no"
		});*/
		//check if the agreement is the same as the one in my last bid or his last bid with flag = true.
		socket.emit('sign' ,data.agreement );
		socket.disconnect();
	});

	socket.on('yourPartnerOpt-out', function (){
		console.log("yourPartnerOpt-out");
		socket.emit('opt-out', true);
		socket.disconnect();
	});

	socket.on("EndGame", function(){
		socket.emit("giveMeMyReservationUtility");
		socket.disconnect();
	});
	
	socket.on('Disconnect', function (status) { 
		console.log("bey bey! :)");
	});
}
