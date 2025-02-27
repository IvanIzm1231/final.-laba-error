let xPos = 420;
let yPos = 432 - 70;
let isMovingRight = false;
let isMovingLeft = false;
let isJumping = false;
let isFalling = false;
let jumpSpeed = 0;
let gravity = 0.8;
let moveSpeed = 7;
let jumpPower = 20;
let facingRight = true;
let bird;
let canyons = [];
let character;
let enemies = [];
let enemySpawnRate = 100;
let isDead = false;
let killedEnemies = 0;
let kickDuration = 15;

// Инициализация звуков
const deathSound = new Audio('./minecraft_death.mp3');
const jumpSound = new Audio('./inoplanetnyiy-pryijok.mp3');
const killSound = new Audio('./udar-nogoy-po-derevyannomu-zaboru.mp3');
let audioEnabled = false;

class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 70;
        this.startX = x;
        this.startY = y;
        this.fallSpeed = 0;
        this.walkCycle = 0;
        this.kickLength = 70;
        this.kickSide = null;
        this.kickTimer = 0;
    }

    update() {
        if (isFalling) {
            this.fallSpeed += 0.5;
            this.y += this.fallSpeed;
            if (this.y > height + 100) this.resetPosition();
        }
        
        if (this.kickSide) {
            this.kickTimer--;
            if (this.kickTimer <= 0) this.kickSide = null;
        }
    }

    move() {
        if (isFalling || isDead) return;
        
        if (isMovingRight) {
            this.x += moveSpeed;
            facingRight = true;
            this.walkCycle += 0.2;
        }
        if (isMovingLeft) {
            this.x -= moveSpeed;
            facingRight = false;
            this.walkCycle += 0.2;
        }
        this.x = constrain(this.x, 0, width - this.width);
        if (this.walkCycle >= TWO_PI) this.walkCycle = 0;
    }

    jump() {
        if (isFalling || isDead) return;
        if (isJumping) {
            this.y -= jumpSpeed;
            jumpSpeed -= gravity;
            if (this.y + this.height >= 432) this.land();
        }
    }

    land() {
        this.y = 432 - this.height;
        isJumping = false;
        jumpSpeed = 0;
    }

    resetPosition() {
        this.x = this.startX;
        this.y = this.startY;
        isFalling = false;
        this.fallSpeed = 0;
        isJumping = false;
        jumpSpeed = 0;
    }

    kick(side) {
        if (!this.kickSide && !isDead) {
            this.kickSide = side;
            this.kickTimer = kickDuration;
        }
    }

    display() {
        if (isDead) return;
        
        push();
        translate(this.x + this.width/2, this.y + this.height/2);
        if (!facingRight) scale(-1, 1);
        
        fill(isFalling ? color(0, 102, 204, 150) : color(0, 102, 204));
        rect(-this.width/2, -this.height/2, this.width, this.height);
        
        fill(isFalling ? color(255, 224, 189, 150) : color(255, 224, 189));
        rect(-this.width/2 + 5, -this.height/2 - 50, this.width - 10, 50);
        
        this.displayLegs();
        this.displayArms();
        
        fill(0, isFalling ? 150 : 255);
        const eyeY = -this.height/2 - 35;
        if (facingRight) {
            ellipse(-this.width/2 + 20, eyeY, 5, 5);
            ellipse(-this.width/2 + 40, eyeY, 5, 5);
        } else {
            ellipse(this.width/2 - 20, eyeY, 5, 5);
            ellipse(this.width/2 - 40, eyeY, 5, 5);
        }
        pop();
    }

    displayLegs() {
        stroke(0);
        strokeWeight(2);
        const swing = sin(this.walkCycle) * 15;
        
        if (this.kickSide) {
            if (this.kickSide === 'right') {
                line(25, 35, 25 + this.kickLength, 35 + 30);
                line(-25, 35, -35 - swing, 35 + 50);
            } else {
                line(-25, 35, -25 - this.kickLength, 35 + 30);
                line(25, 35, 35 + swing, 35 + 50);
            }
        } else if (isJumping) {
            line(-25, 35, -35, 35 + 25);
            line(25, 35, 35, 35 + 25);
        } else {
            line(-25, 35, -35 - swing, 35 + 50);
            line(25, 35, 35 + swing, 35 + 50);
        }
    }

    displayArms() {
        stroke(0);
        strokeWeight(2);
        const swing = cos(this.walkCycle) * 10;
        line(-30, -25, -50 - swing, -15);
        line(30, -25, 50 + swing, -15);
    }

    checkKickCollision(enemy) {
        if (!this.kickSide) return false;
        
        const kickX = this.kickSide === 'left' 
            ? this.x - this.kickLength 
            : this.x + this.width;
        
        const kickRect = {
            x: kickX,
            y: this.y + this.height/2,
            width: this.kickLength,
            height: 30
        };
        
        return this.rectRectCollision(kickRect, {
            x: enemy.x - enemy.size/2,
            y: enemy.y - enemy.size/2,
            width: enemy.size,
            height: enemy.size
        });
    }

    rectRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
}

class Canyon {
    constructor(x, width) {
        this.x = x;
        this.width = width;
        this.depth = 300;
    }

    display() {
        for (let i = 0; i < this.depth; i++) {
            fill(40, 40, 40, map(i, 0, this.depth, 50, 200));
            rect(this.x, 432 + i, this.width, 1);
        }
    }

    checkCollision(character) {
        const isOverEdge = character.x + character.width > this.x &&
                         character.x < this.x + this.width &&
                         character.y + character.height <= 432;
        if (isOverEdge && !isJumping && !isFalling) {
            isFalling = true;
            isMovingLeft = false;
            isMovingRight = false;
        }
    }
}

class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = random(1, 3);
        this.direction = random([-1, 1]);
        this.isFalling = false;
    }

    move() {
        if (!this.isFalling) {
            this.x += this.speed * this.direction;
            if (this.x < 0 || this.x > width) this.direction *= -1;
            this.y += random(-0.5, 0.5);
            this.y = constrain(this.y, 50, height - 100);
        } else {
            this.y += 5;
        }
    }

    display() {
        fill(0);
        rect(this.x, this.y, 30, 30);
        fill(255, 255, 0);
        if (this.direction > 0) {
            triangle(this.x + 30, this.y + 10, this.x + 30, this.y + 20, this.x + 40, this.y + 15);
        } else {
            triangle(this.x, this.y + 10, this.x, this.y + 20, this.x - 10, this.y + 15);
        }
    }
}

class Enemy {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.size = 40;
        this.speed = 3;
        this.direction = direction;
        this.angle = 0;
        this.alive = true;
    }

    update() {
        if (!this.alive) return;
        this.x += this.speed * this.direction;
        this.angle += this.direction * 0.1;
    }

    display() {
        if (!this.alive) return;
        push();
        translate(this.x, this.y);
        rotate(this.angle);
        
        fill(0);
        ellipse(0, 0, this.size);
        
        fill(255);
        const eyeOffset = this.size * 0.2;
        ellipse(-this.size/4, -eyeOffset, 8, 8);
        ellipse(this.size/4, -eyeOffset, 8, 8);
        
        fill(255, 0, 0);
        ellipse(-this.size/4 + cos(this.angle)*2, -eyeOffset + sin(this.angle)*2, 4, 4);
        ellipse(this.size/4 + cos(this.angle)*2, -eyeOffset + sin(this.angle)*2, 4, 4);
        
        pop();
    }

    checkCollision(character) {
        if (!this.alive) return false;
        const dx = character.x + character.width/2 - this.x;
        const dy = character.y + character.height/2 - this.y;
        return sqrt(dx*dx + dy*dy) < (this.size/2 + character.width/2);
    }
}

function setup() {
    createCanvas(1050, 550);
    character = new Character(xPos, yPos);
    bird = new Bird(random(width), random(50, 200));
    canyons.push(new Canyon(200, 150));
    canyons.push(new Canyon(700, 100));
    
    // Активация звуков при первом клике
    const activateAudio = () => {
        if (!audioEnabled) {
            jumpSound.play().then(() => {
                jumpSound.pause();
                audioEnabled = true;
            });
        }
    };
    document.addEventListener('click', activateAudio, {once: true});
}

function draw() {
    background(122, 160, 260);
    fill(255);
    textSize(24);
    text("Kills: " + killedEnemies, 20, 30);

    drawEnvironment();
    canyons.forEach(canyon => canyon.display());
    drawGround();
    canyons.forEach(canyon => canyon.checkCollision(character));
    
    character.update();
    character.move();
    character.jump();
    character.display();
    
    bird.move();
    bird.display();

    if (!isDead && frameCount % enemySpawnRate === 0) {
        enemies.push(new Enemy(random() > 0.5 ? -50 : width + 50, 432 - 20, random([-1, 1])));
        enemySpawnRate = max(30, enemySpawnRate - 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i].alive) {
            enemies.splice(i, 1);
            continue;
        }
        
        enemies[i].update();
        enemies[i].display();
        
        if (character.checkKickCollision(enemies[i])) {
            enemies[i].alive = false;
            killedEnemies++;
            if (audioEnabled) {
                killSound.currentTime = 0;
                killSound.play();
            }
        } 
        else if (enemies[i].checkCollision(character)) {
            if (!isDead) {
                isDead = true;
                if (audioEnabled) {
                    deathSound.currentTime = 0;
                    deathSound.play();
                }
            }
        }
        
        if (enemies[i].x < -100 || enemies[i].x > width + 100) {
            enemies.splice(i, 1);
        }
    }

    if (isDead) {
        fill(255, 0, 0, 150);
        rect(0, 0, width, height);
        fill(255);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("GAME OVER", width/2, height/2);
        textSize(20);
        text("Press R to restart", width/2, height/2 + 40);
    }
}

function drawGround() {
    noStroke();
    fill(0, 155, 0);
    let currentX = 0;
    canyons.forEach(canyon => {
        if (currentX < canyon.x) rect(currentX, 432, canyon.x - currentX, 118);
        currentX = canyon.x + canyon.width;
    });
    if (currentX < width) rect(currentX, 432, width - currentX, 118);
}

function drawEnvironment() {
    noStroke();
    fill(255);
    ellipse(600, 190, 90, 75);
    ellipse(650, 210, 75, 55);
    ellipse(550, 210, 75, 55);
    
    fill(90);
    triangle(80, 432, 200, 90, 350, 432);
    fill(110);
    triangle(180, 432, 290, 100, 380, 432);
    
    fill(218, 165, 32);
    ellipse(100, 150, 120, 120);
}

function keyPressed() {
    if (isDead && keyCode === 82) {
        isDead = false;
        character.resetPosition();
        enemies = [];
        enemySpawnRate = 100;
        killedEnemies = 0;
        return;
    }
    if (isDead) return;
    
    if (keyCode === 68) isMovingRight = true;
    if (keyCode === 65) isMovingLeft = true;
    if (keyCode === 32 && !isJumping) {
        isJumping = true;
        jumpSpeed = jumpPower;
        if (audioEnabled) {
            jumpSound.currentTime = 0;
            jumpSound.play();
        }
    }
    if (keyCode === 70) bird.isFalling = true;
    if (keyCode === 75) character.kick('left');
    if (keyCode === 76) character.kick('right');
}

function keyReleased() {
    if (isDead) return;
    if (keyCode === 68) isMovingRight = false;
    if (keyCode === 65) isMovingLeft = false;
}