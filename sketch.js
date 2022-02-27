//set basic global variables for game
var bug = [];
var bugcount = 30;
var gamestart = false;
var gameover = false;
var speed = 4;
var time = 30;
var framerate = 12;
var frames = 1;
var score = 0;

var sfx;
var synth;
var seq;

var spray;
var joystick = [419,335,1];
var vrX;
var vrY;
var buttonPressed = 1;
var serial;
var latestData = 'waiting for data';
const portName = 'COM3';

//loads bugs as an object of type Crawler and loads the spray cursor
function preload(){
  for(var i = 0; i < bugcount; i++){
      bug[i] = new Crawler("bug.png");
  }
  
  spray = loadImage("spray.png");
    
}

//establish framerate, canvas size, and imageMode
function setup() {
  
  frameRate(framerate);
  createCanvas(840,680);
  imageMode(CENTER);
  
  //establish sfx and a synth to play melodies
  sfx = new Tone.Players({
    squish: "squish.mp3",
    miss: "miss.mp3",
    tada: "tada.mp3"
  }).toDestination();
  
  synth = new Tone.Synth().toDestination();
  
  //title screen jingle on start
  if(!gamestart && !gameover){
    now = Tone.now();
    
    synth.triggerAttackRelease('C2','2n',now);
    synth.triggerAttackRelease('Eb2','2n',now+0.5);
    synth.triggerAttackRelease('F2','2n',now+1);
    synth.triggerAttackRelease('Gb2','2n',now+1.5);
  }
  
  //main looping theme of game, will get sped up as score increases later on
  seq = new Tone.Sequence((time, note) => {
    synth.triggerAttackRelease(note, 0.1, time);
  }, ["C3","Eb3", "F3", "Gb3", ["G3", "Gb3", "F3"], "Eb3", "C3","G2"]).start(0);
  
  serial = new p5.SerialPort();  
  serial.open(portName);  
  serial.on('data', gotData);

}

function gotData()
{
  latestData = serial.readLine();
  trim(latestData);
  if(!latestData) return;
  joystick = split(latestData, ',');
  console.log(joystick);
  serial.write('A');
}

//goes through all bugs, checks to see if where the user clicked is inside where the bug is - if yes, it kills the bug, stops it,
//and resets frame count so that bugs can't be double-clicked/killed repeatedly
function squishAttempt(){
  for(var i = 0; i < bug.length; i++){
    if(gamestart && vrX > bug[i].x-42 && vrX < bug[i].x+42 && vrY > bug[i].y-42 && vrY < bug[i].y+42){
      if(bug[i].kill === false) {
        bug[i].moving = 0;
        bug[i].frame = 0;        
      }
      bug[i].kill = true;      
      return;      
    }       
  }
  //plays tap sound if player clicks anywhere not on a bug during the game
  if(gamestart && !gameover) sfx.player('miss').start();
  return;
}

//makes the enter key start the game
function keyPressed(){
  if(keyCode == ENTER){
    gamestart = true;
  }  
}

//main function for drawing bugs, establishing gamestates (start/finish); main loop for game
function draw() {  
 
  //checks for gameover
  if(gameover){
      background(11,154,35);  
    
      //ends game ost loop   
      Tone.Transport.stop("0.1");      
        
      endgame();
      return;
    }
  
  //main loop for game progression, starts by establishing timer
  if(gamestart){
    background(11,154,35);
    
    if (buttonPressed == 0){
      squishAttempt();
    }
   
    Tone.Transport.start();
    Tone.Transport.bpm.rampTo(180,30);
    
    //decreases time value by 1 each second
    if(frames % framerate == 0){
      time--;
    }
    frames++;
    
    //if the bug array is empty, then no bugs are left and the game needs to end; plays victory fanfare
    if(bug.length == 0){
      gameover = true;
      gamestart = false;
      sfx.player('tada').start();
      return;
    }
    
    //if the time remaining reaches zero, then the game needs to end
    if(time < 0){
      gameover = true;
      gamestart = false;
      sfx.player('tada').start();
      return;
    }
    
    //main loop for drawing the bugs
    for(var i = 0; i < bug.length; i++){ 
        bug[i].draw();        
    } 
    
    //whenever a bug is clicked on/killed, it is spliced out of the array, the score increases by 1, and the speed increases by 1
    for(i = 0; i < bug.length; i++){ 
      if(bug[i].kill && bug[i].frame > 3){
        bug.splice(i,1);
        score++;
        speed++;
      }
    
    //draws timer on top of layer with bugs, in top left corner
    text("Time Remaining:   " + time,40,40);
    }
    
    image(spray,vrX,vrY);    
    
    vrX = joystick[0];
    vrY = joystick[1];
    
    buttonPressed = joystick[2];

  }
  
  //this sets up the intro screen and awaits the user's "Enter" input before starting the game
  else{
    background(11,154,35);
    textSize(46);
    text("BUG SQUISH",250,290);
    textSize(32);
    text("[Press Enter to start]",250,390);    
  }
}

//main function for bug object, loads in the spritesheet and initializes each object in the array to a random location
function Crawler(imageName) {
  this.spriteSheet = loadImage(imageName);
  this.frame = 0;
  this.x = Math.floor(random(40,800));
  this.y = Math.floor(random(40,640));
  this.kill = false;
  
  //this conditional sets bugs starting facing up or down
  if(Math.floor(random(0,2)) === 0){
    this.moving = 1
  }
  else{
    this.moving = -1
  }

  //makes a draw method inside of the Crawler object that does a whole lot of things described below
  this.draw = function() {
    
    //necessary because we're using the translate transformation for each object in the array
    push();

    //sets the random x and y coordinates for drawn objects
    translate(this.x,this.y);

    //this is the "kill-switch" - essentially whenever an object is killed (by clicking), it draws/plays the death animation
    if(this.kill){
      if(this.moving<0){
        scale(1.0,-1.0);
      }

      if(this.frame ==0){
          image(this.spriteSheet, 0, 0, 52, 52, 156, 0, 52, 52);
          sfx.player('squish').start();
          serial.write('H');
        }
        if(this.frame ==1){
          image(this.spriteSheet, 0, 0, 52, 52, 208, 0, 52, 52);
        }
        if(this.frame ==2){
          image(this.spriteSheet, 0, 0, 52, 52, 260, 0, 52, 52);
        }
        if(this.frame ==3){
          image(this.spriteSheet, 0, 0, 52, 52, 312, 0, 52, 52)
          serial.write('L');
        }

        this.frame++;
        
        //resets the canvas to its position before translate was run, we need this before we're ending the function early
        pop();
        //return ends the function, ensuring that the rest of draw doesn't run, so we don't keep drawing a dead bug
        return;

    } 
    //flips image of bug when it changes directions
    if(this.moving<0){
      scale(1.0,-1.0);
    }
    //default sprite of bug
    if(this.moving ==0){
      image(this.spriteSheet, 0, 0, 52, 52, 0, 0, 52, 52);
    }
    //bug animation frames
    else{
        if(this.frame ==0){
          image(this.spriteSheet, 0, 0, 52, 52, 52, 0, 52, 52);
        }
        if(this.frame ==1){
          image(this.spriteSheet, 0, 0, 52, 52, 0, 0, 52, 52);
        }
        if(this.frame ==2){
          image(this.spriteSheet, 0, 0, 52, 52, 104, 0, 52, 52);
        }

        this.frame++;
        //simple reset of animation loop
        if(this.frame > 2){
          this.frame = 0;
        }
        //this is what updates the position of the bugs in the y-axis, w/ direction and speed
        this.y = this.y+this.moving*speed;
        if(this.y<30){
          this.moving = 1;
        }
        if(this.y>height-30){
          this.moving = -1;
        }
        
      }
    //same as above, need due to the translation of objects, placed again here because the kill function ended the draw early
    pop();


  }  
}

//re-establishes starting variables when the game ends so that when the game is potentially restarted, the new values are fresh
function endgame(){
  bug = [];
  bugcount = 30;  
  speed = 4;
  time = 30;
  frames = 0;
  
  //resets bpm of game theme
  Tone.Transport.bpm.value = 120;
  
  //if the game is started again with "Enter", initiates a new set of bugs and resets gameover state and score
  if(gamestart == true){
    for(var i = 0; i < bugcount; i++){
      bug[i] = new Crawler("bug.png");
    }
    gameover = false;
    score = 0;   
    
  }
  
  //has to be under the above if-statement so that it still works, otherwise it would overwrite gamestart every time "Enter" is pressed
  gamestart = false;

  //text after the game is completed (time runs out or all bugs squished) that prompts user to press Enter to return to title screen
  text("You squished " + score + " bugs!",230,290);
  text("Return to title? [Press Enter]",200,390);  
  
}