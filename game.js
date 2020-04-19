var gameSpeed = 60;
var currLevel = 0;

var canv = document.getElementById('canvas');
canv.width = window.innerWidth;
canv.height = window.innerHeight;
canv.style.position = 'absolute';
canv.style.top = 0;
canv.style.left = 0;

var started = false;
var menu = false;

var balls = [];
var paddle;
var gravity = 0.0005;
var mouseX = canv.width/2;
var mouseY = canv.height/1.5;
var paddleRotation = 0;
var paddleRotationSpeed = 0.1;
var paddleRotationTarget = 0;

var paddleAudio = [new Audio('paddle1.mp3')];
var ballAudio = [new Audio('ball1.mp3'), new Audio('ball2.mp3'), new Audio('ball3.mp3'), new Audio('ball4.mp3'), new Audio('ball5.mp3')];

function playAudio(audioList) {
	if(audioList.length == 0) {
		return;
	}

	var num = Math.floor(Math.random()*(audioList.length));
	var promise = audioList[num].play();

	if (promise !== undefined) {
		promise.then(_ => {
			let addList = audioList;
			function addBack() {
				addList.push(this);
				this.removeEventListener('ended', addBack);
			}
			audioList[num].addEventListener('ended', addBack);

			audioList.splice(num, 1);
		}).catch(error => {});
	}
}

function contains(list, item) {
	for(var i in list) {
		if(list[i] == item) {
			return i;
		}
	}

	return false;
}

function sort(list, lambda) {
	if(list.length < 2) {
		return list;
	}

	var i = 0;
	while(i+1 < list.length) {
		if(lambda(list[i], list[i+1])) {
			var tempElem = list[i];

			list[i] = list[i+1];
			list[i+1] = tempElem;
		}

		i += 1;
	}

	return list;
}

function checkCollision(object1, object2) {
	for(var i in object1.faces) {
		var face1 = object1.faces[i].getExtremes();
		for(var j in object2.faces) {
			var face2 = object2.faces[j].getExtremes();
			if(face1.x[0] <= face2.x[1] && face1.x[1] >= face2.x[0] &&
				face1.y[0] <= face2.y[1] && face1.y[1] >= face2.y[0] &&
				face1.z[0] <= face2.z[1] && face1.z[1] >= face2.z[0]) {
				return true;
			}
		}
	}

	return false;
}

var inputs = [];

function degToRad(degrees) {
	return (degrees * Math.PI/180);
}

function vectorNegate(vector) {
	return {
		'x': -vector.x,
		'y': -vector.y,
		'z': -vector.z};
}

function copyVector(vector) {
	return {
		'x': vector.x,
		'y': vector.y,
		'z': vector.z};
}

function getMagnitude(vector) {
	return Math.sqrt(vector.x*vector.x + vector.y*vector.y + vector.z*vector.z);
}

function vectorScale(vector, scale) {
	return {
		'x': vector.x*scale,
		'y': vector.y*scale,
		'z': vector.z*scale};
}

function addVector(vector1, vector2) {
	return {
		'x': vector1.x+vector2.x,
		'y': vector1.y+vector2.y,
		'z': vector1.z+vector2.z};
}

function vectorSubtract(vector1, vector2) {
	return {
		'x': vector1.x-vector2.x,
		'y': vector1.y-vector2.y,
		'z': vector1.z-vector2.z};
}

function vectorNormalize(vector) {
	var magnitude = getMagnitude(vector);

	if(magnitude == 0) {
		return {
			'x': 0,
			'y': 0,
			'z': 0};
	}

	return {
		'x': vector.x/magnitude,
		'y': vector.y/magnitude,
		'z': vector.z/magnitude};
}

function vectorDotProduct(vector1, vector2) {
	return vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
}

function vectorCrossProduct(vector1, vector2) {
	return {
		'x': vector1.y * vector2.z - vector1.z * vector2.y,
		'y': vector1.z * vector2.x - vector1.x * vector2.z,
		'z': vector1.x * vector2.y - vector1.y * vector2.x};
}

function applyTranslationVector(vector1, vector2) {
	return {
		'x': vector1.x + vector2.x,
		'y': vector1.y + vector2.y,
		'z': vector1.z + vector2.z};
}

function applyMatrixScale(matrix, scale) {
	for(var i in matrix) {
		for(var j in matrix[i]) {
			matrix[i][j] = matrix[i][j]*scale;
		}
	}
}

function applyTransformationMatrix(vector, matrix) {
	newX = vector.x * matrix[0][0] + vector.y * matrix[1][0] + vector.z * matrix[2][0] + matrix[3][0];
	newY = vector.x * matrix[0][1] + vector.y * matrix[1][1] + vector.z * matrix[2][1] + matrix[3][1];
	newZ = vector.x * matrix[0][2] + vector.y * matrix[1][2] + vector.z * matrix[2][2] + matrix[3][2];
	var w = vector.x * matrix[0][3] + vector.y * matrix[1][3] + vector.z * matrix[2][3] + matrix[3][3];

	if(w != 0) {
		newX = newX/w;
		newY = newY/w;
		newZ = newZ/w;
	}

	return {
		'x': newX,
		'y': newY,
		'z': newZ};
}

// ONLY WORKS FOR THIS SPECIFIC CASE
function getInverseMatrix(matrix) {
	return [
		[matrix[0][0], matrix[1][0], matrix[2][0], 0],
		[matrix[0][1], matrix[1][1], matrix[2][1], 0],
		[matrix[0][2], matrix[1][2], matrix[2][2], 0],
		[-(matrix[3][0] * matrix[0][0] + matrix[3][1] * matrix[1][0] + matrix[3][2] * matrix[2][0]),
			-(matrix[3][0] * matrix[0][1] + matrix[3][1] * matrix[1][1] + matrix[3][2] * matrix[2][1]), 
			-(matrix[3][0] * matrix[0][2] + matrix[3][1] * matrix[1][2] + matrix[3][2] * matrix[2][2]), 1]];
}

function getRotationMatrix(vector) {
	var newAngleX = degToRad(vector.x);
	var newAngleY = degToRad(vector.y);
	var newAngleZ = degToRad(vector.z);
	return [
		[Math.cos(newAngleY)*Math.cos(newAngleZ),
			-Math.cos(newAngleX)*Math.sin(newAngleZ) + Math.sin(newAngleX)*Math.sin(newAngleY)*Math.cos(newAngleZ),
			Math.sin(newAngleX)*Math.sin(newAngleZ) + Math.cos(newAngleX)*Math.sin(newAngleY)*Math.cos(newAngleZ),
			0],
		[Math.cos(newAngleY)*Math.sin(newAngleZ),
			Math.cos(newAngleX)*Math.cos(newAngleZ) + Math.sin(newAngleX)*Math.sin(newAngleY)*Math.sin(newAngleZ),
			-Math.sin(newAngleX)*Math.cos(newAngleZ) + Math.cos(newAngleX)*Math.sin(newAngleY)*Math.sin(newAngleZ),
			0],
		[-Math.sin(newAngleY),
			Math.sin(newAngleX)*Math.cos(newAngleY),
			Math.cos(newAngleX)*Math.cos(newAngleY),
			0],
		[0, 0, 0, 1]];
}

function getPointAtMatrix(camera) {
	var up = {'x': 0, 'y': 1, 'z': 0};

	var newForward = camera.look;
	var newUp = vectorNormalize(vectorSubtract(vectorScale(newForward, vectorDotProduct(up, newForward)), up));
	var newRight = vectorCrossProduct(newUp, newForward);

	return getInverseMatrix([
		[newRight.x, newRight.y, newRight.z, 0],
		[newUp.x, newUp.y, newUp.z, 0],
		[newForward.x, newForward.y, newForward.z, 0],
		[camera.position['x'], camera.position['y'], camera.position['z'], 1]]);
}

function getProjectionMatrix(camera) {
	var newFov = 1/Math.tan(degToRad(camera['fov']/2));

	return [
		[camera['aspectRatio'] * newFov, 0, 0, 0],
		[0, newFov, 0, 0],
		[0, 0, camera['zfar'] / (camera['zfar'] - camera['znear']), 1],
		[0, 0, (-camera['zfar'] * camera['znear']) / (camera['zfar'] - camera['znear']), 0]];
}

class Vertex {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	translate(vector) {
		var v = applyTranslationVector(this, vector);

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
	}

	transform(matrix) {
		var v = applyTransformationMatrix(this, matrix);

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
	}

	rotate(origin, vector) {
		this.x -= origin.x;
		this.y -= origin.y;
		this.z -= origin.z;

		var v = applyTransformationMatrix(this, getRotationMatrix(vector));

		this.x = v.x + origin.x;
		this.y = v.y + origin.y;
		this.z = v.z + origin.z;
	}

	copy() {
		return new Vertex(this.x, this.y, this.z);
	}
}

class Face {
	constructor(color, vertices) {
		this.color = color;
		this.vertices = vertices;
	}

	translate(vector) {
		for(var i in this.vertices) {
			this.vertices[i].translate(vector);
		}
	}

	transform(matrix) {
		for(var i in this.vertices) {
			this.vertices[i].transform(matrix);
		}
	}

	rotate(origin, vector) {
		for(var i in this.vertices) {
			this.vertices[i].rotate(origin, vector);
		}
	}

	getExtremes() {
		var extremes = {'x': [null, null], 'y': [null, null], 'z': [null, null]};
		for(var i in this.vertices) {
			for(var j in extremes) {
				if(!extremes[j][0] || extremes[j][0] > this.vertices[i][j]) {
					extremes[j][0] = this.vertices[i][j];
				}

				if(!extremes[j][1] || extremes[j][1] < this.vertices[i][j]) {
					extremes[j][1] = this.vertices[i][j];
				}
			}
		}

		return extremes;
	}

	getNormal() {
		var vector1 = {
			'x': this.vertices[1].x - this.vertices[0].x,
			'y': this.vertices[1].y - this.vertices[0].y,
			'z': this.vertices[1].z - this.vertices[0].z};

		var vector2 = {
			'x': this.vertices[2].x - this.vertices[0].x,
			'y': this.vertices[2].y - this.vertices[0].y,
			'z': this.vertices[2].z - this.vertices[0].z};

		var normal = vectorNormalize(vectorCrossProduct(vector1, vector2));

		return normal;
	}

	getAverageZ() {
		var total = 0;
		for(var i in this.vertices) {
			total += this.vertices[i].z;
		}

		return total/this.vertices.length;
	}

	getColor(camera) {
		var dp = vectorDotProduct(this.getNormal(), camera['lighting']);
		return 'rgba(' + (parseInt(Math.max(this.color['r']*(0.45+0.55*dp), this.color['r']/4))).toString() + ', ' +
			(parseInt(Math.max(this.color['g']*dp, this.color['g']/2))).toString() + ', ' +
			(parseInt(Math.max(this.color['b']*dp, this.color['b']/2))).toString() + ', ' +
			this.color['a'].toString() + ')';
	}

	copy() {
		var copyVertices = [];
		for(var i in this.vertices) {
			copyVertices.push(this.vertices[i].copy());
		}

		return new Face(this.color, copyVertices);
	}
}

class Body {
	constructor(faces) {
		this.faces = faces;
	}

	translate(vector) {
		for(var i in this.faces) {
			this.faces[i].translate(vector);
		}
	}

	transform(matrix) {
		for(var i in this.faces) {
			this.faces[i].transform(matrix);
		}
	}

	rotate(vector) {
		for(var i in this.faces) {
			this.faces[i].rotate(this.getCenter(), vector);
		}
	}

	// Look at the extremes and find the average of those
	getCenter() {
		var extremes = {'x': [null, null], 'y': [null, null], 'z': [null, null]};
		for(var i in this.faces) {
			var faceExtremes = this.faces[i].getExtremes();
			for(var j in faceExtremes) {
				if(!extremes[j][0] || extremes[j][0] > faceExtremes[j][0]) {
					extremes[j][0] = faceExtremes[j][0];
				}

				if(!extremes[j][1] || extremes[j][1] < faceExtremes[j][1]) {
					extremes[j][1] = faceExtremes[j][1];
				}
			}
		}

		return {'x': (extremes.x[0] + extremes.x[1])/2, 'y': (extremes.y[0] + extremes.y[1])/2, 'z': (extremes.z[0] + extremes.z[1])/2};
	}

	copy() {
		var copyFaces = [];
		for(var i in this.faces) {
			copyFaces.push(this.faces[i].copy());
		}

		return new Body(copyFaces);
	}
}

class Camera {
	constructor(position, look, aspectRatio, fov, znear, zfar, lighting, moveSpeed, rotateSpeed) {
		this.position = position;
		this.look = look;
		this.aspectRatio = aspectRatio;
		this.fov = fov;
		this.znear = znear;
		this.zfar = zfar;
		this.lighting = lighting;
		this.moveSpeed = moveSpeed;
		this.rotateSpeed = rotateSpeed;
	}

	translate(vector, speed) {
		if(!speed) {
			speed = this.moveSpeed;
		}

		vector = vectorScale(vectorNormalize(vector), speed);
		this.position = applyTranslationVector(this.position, vector);
	}

	rotate(vector, speed, real) {
		if(!speed) {
			speed = this.rotateSpeed;
		}

		vector = vectorScale(vectorNormalize(vector), speed);
		this.look = vectorNormalize(applyTransformationMatrix(this.look, getRotationMatrix(vector)));
	}
}

class Level {
	constructor(color, bodies) {
		this.color = color;
		this.bodies = bodies;
	}

	translate(vector) {
		for(var i in this.bodies) {
			this.bodies[i].translate(vector);
		}
	}

	transform(matrix) {
		for(var i in this.bodies) {
			this.bodies[i].transform(matrix);
		}
	}

	getColor() {
		return 'rgba(' + this.color['r'].toString() + ', ' +
			this.color['g'].toString() + ', ' +
			this.color['b'].toString() + ', ' +
			this.color['a'].toString() + ')';
	}

	copy() {
		var copyBodies = [];
		for(var i in this.bodies) {
			copyBodies.push(this.bodies[i].copy());
		}

		return new Level(this.color, copyBodies);
	}
}

var levels = [new Level({r: 40, g: 40, b: 40, a: 1}, [
	new Body([
		new Face({r: 0, g: 0, b: 200, a: 1}, [
			new Vertex(-0.5, -0.5, 1),
			new Vertex(-0.5, 0.5, 1),
			new Vertex(0.5, 0.5, 1),
			new Vertex(0.5, -0.5, 1)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.0025, -0.5, 1),
			new Vertex(-0.0025, 0.5, 1),
			new Vertex(0.0025, 0.5, 1),
			new Vertex(0.0025, -0.5, 1)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.485, -0.5, 1),
			new Vertex(0.485, 0.5, 1),
			new Vertex(0.5, 0.5, 1),
			new Vertex(0.5, -0.5, 1)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.485, -0.5, 1),
			new Vertex(-0.5, -0.5, 1),
			new Vertex(-0.5, 0.5, 1),
			new Vertex(-0.485, 0.5, 1)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.5, 0.515, 1),
			new Vertex(0.5, 0.5, 1),
			new Vertex(-0.5, 0.5, 1),
			new Vertex(-0.5, 0.515, 1)])]),
	new Body([
		new Face({r: 0, g: 0, b: 200, a: 1}, [
			new Vertex(-0.5, -0.2, -0.01),
			new Vertex(-0.5, -0.2, 0.99),
			new Vertex(0.5, -0.2, 0.99),
			new Vertex(0.5, -0.2, -0.01)]),
		new Face({r: 140, g: 140, b: 140, a: 1}, [
			new Vertex(-0.5, -0.23, -0.01),
			new Vertex(-0.5, -0.199, -0.01),
			new Vertex(0.5, -0.199, -0.01),
			new Vertex(0.5, -0.23, -0.01)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.0025, -0.2, -0.01),
			new Vertex(-0.0025, -0.2, 0.99),
			new Vertex(0.0025, -0.2, 0.99),
			new Vertex(0.0025, -0.2, -0.01)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.485, -0.2, -0.01),
			new Vertex(0.485, -0.2, 0.99),
			new Vertex(0.5, -0.2, 0.99),
			new Vertex(0.5, -0.2, -0.01)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.485, -0.2, -0.01),
			new Vertex(-0.5, -0.2, -0.01),
			new Vertex(-0.5, -0.2, 0.99),
			new Vertex(-0.485, -0.2, 0.99)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.5, -0.2, 0.005),
			new Vertex(0.5, -0.2, -0.01),
			new Vertex(-0.5, -0.2, -0.01),
			new Vertex(-0.5, -0.2, 0.005)])]),
	new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.5, -0.2, 0.99),
			new Vertex(0.5, -0.2, 0.982),
			new Vertex(-0.5, -0.2, 0.982),
			new Vertex(-0.5, -0.2, 0.99)])])
	])];

function setup() {
	window.levelCam = new Camera(
		{'x': 0, 'y': 0.27, 'z': -0.546},
		vectorNormalize({'x': 0, 'y': -0.287, 'z': 0.958}),
		0,
		70,
		0.1,
		10,
		vectorNormalize({
			'x': 0,
			'y': 0,
			'z': -1}),
		0.02,
		1);

	var ball = new Body([
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.1, -0.1, -0.1),
			new Vertex(-0.1, 0.1, -0.1),
			new Vertex(0.1, 0.1, -0.1),
			new Vertex(0.1, -0.1, -0.1)]),
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.1, -0.1, 0.1),
			new Vertex(0.1, 0.1, 0.1),
			new Vertex(-0.1, 0.1, 0.1),
			new Vertex(-0.1, -0.1, 0.1)]),
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(0.1, -0.1, -0.1),
			new Vertex(0.1, 0.1, -0.1),
			new Vertex(0.1, 0.1, 0.1),
			new Vertex(0.1, -0.1, 0.1)]),
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.1, -0.1, 0.1),
			new Vertex(-0.1, 0.1, 0.1),
			new Vertex(-0.1, 0.1, -0.1),
			new Vertex(-0.1, -0.1, -0.1)]),
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.1, -0.1, 0.1),
			new Vertex(-0.1, -0.1, -0.1),
			new Vertex(0.1, -0.1, -0.1),
			new Vertex(0.1, -0.1, 0.1)]),
		new Face({r: 240, g: 240, b: 240, a: 1}, [
			new Vertex(-0.1, 0.1, -0.1),
			new Vertex(-0.1, 0.1, 0.1),
			new Vertex(0.1, 0.1, 0.1),
			new Vertex(0.1, 0.1, -0.1)])]);

	ball.transform([
		[0.2, 0, 0, 0],
		[0, 0.2, 0, 0],
		[0, 0, 0.2, 0],
		[0, 0, 0, 0]]);

	ball.translate({'x': 0, 'y': 0.3, 'z': 0});

	balls.push({'restitution': 0.9, 'weight': 1, 'velocity': {'x': ((Math.random() >= 0.5) ? 0.0015 : -0.0015), 'y': 0, 'z': 0.014}, 'body': ball});
	levels[currLevel].bodies.push(ball);

	paddle = new Body([
		new Face({r: 184, g: 142, b: 94, a: 1}, [
			new Vertex(-0.018, -0.16, -0.015),
			new Vertex(-0.018, -0.08, -0.015),
			new Vertex(0.018, -0.08, -0.015),
			new Vertex(0.018, -0.16, -0.015)]),
		new Face({r: 184, g: 142, b: 94, a: 1}, [
			new Vertex(0.018, -0.16, 0.015),
			new Vertex(0.018, -0.08, 0.015),
			new Vertex(-0.018, -0.08, 0.015),
			new Vertex(-0.018, -0.16, 0.015)]),
		new Face({r: 184, g: 142, b: 94, a: 1}, [
			new Vertex(0.018, -0.16, -0.015),
			new Vertex(0.018, -0.08, -0.015),
			new Vertex(0.018, -0.08, 0.015),
			new Vertex(0.018, -0.16, 0.015)]),
		new Face({r: 184, g: 142, b: 94, a: 1}, [
			new Vertex(-0.018, -0.16, 0.015),
			new Vertex(-0.018, -0.08, 0.015),
			new Vertex(-0.018, -0.08, -0.015),
			new Vertex(-0.018, -0.16, -0.015)]),
		new Face({r: 184, g: 142, b: 94, a: 1}, [
			new Vertex(-0.018, -0.16, 0.015),
			new Vertex(-0.018, -0.16, -0.015),
			new Vertex(0.018, -0.16, -0.015),
			new Vertex(0.018, -0.16, 0.015)]),
		new Face({r: 240, g: 50, b: 0, a: 1}, [
			new Vertex(-0.08, -0.08, -0.015),
			new Vertex(-0.08, 0.08, -0.015),
			new Vertex(0.08, 0.08, -0.015),
			new Vertex(0.08, -0.08, -0.015)]),
		new Face({r: 240, g: 50, b: 0, a: 1}, [
			new Vertex(0.08, -0.08, 0.015),
			new Vertex(0.08, 0.08, 0.015),
			new Vertex(-0.08, 0.08, 0.015),
			new Vertex(-0.08, -0.08, 0.015)]),
		new Face({r: 30, g: 30, b: 30, a: 1}, [
			new Vertex(0.08, -0.08, -0.015),
			new Vertex(0.08, 0.08, -0.015),
			new Vertex(0.08, 0.08, 0.015),
			new Vertex(0.08, -0.08, 0.015)]),
		new Face({r: 30, g: 30, b: 30, a: 1}, [
			new Vertex(-0.08, -0.08, 0.015),
			new Vertex(-0.08, 0.08, 0.015),
			new Vertex(-0.08, 0.08, -0.015),
			new Vertex(-0.08, -0.08, -0.015)]),
		new Face({r: 30, g: 30, b: 30, a: 1}, [
			new Vertex(-0.08, -0.08, 0.015),
			new Vertex(-0.08, -0.08, -0.015),
			new Vertex(-0.018, -0.08, -0.015),
			new Vertex(-0.018, -0.08, 0.015)]),
		new Face({r: 30, g: 30, b: 30, a: 1}, [
			new Vertex(0.018, -0.08, 0.015),
			new Vertex(0.018, -0.08, -0.015),
			new Vertex(0.08, -0.08, -0.015),
			new Vertex(0.08, -0.08, 0.015)]),
		new Face({r: 30, g: 30, b: 30, a: 1}, [
			new Vertex(-0.08, 0.08, -0.015),
			new Vertex(-0.08, 0.08, 0.015),
			new Vertex(0.08, 0.08, 0.015),
			new Vertex(0.08, 0.08, -0.015)])]);

	paddle.translate({'x': 0, 'y': 0, 'z': -0.025});

	levels[currLevel].bodies.push(paddle);
}

function render(level, canvas, camera) {
	var context = canvas.getContext('2d');

	context.fillStyle = level.getColor();
	context.fillRect(0, 0, canvas.width, canvas.height);

	var facesToDraw = [];
	for(var i in level.bodies) {
		var body = level.bodies[i];
		for(var j in body.faces) {
			var face = body.faces[j];
			var toCameraVector = {
				'x': face.vertices[0].x - camera.position['x'],
				'y': face.vertices[0].y - camera.position['y'],
				'z': face.vertices[0].z - camera.position['z']};

			if(vectorDotProduct(face.getNormal(), toCameraVector) < 0) {
				face.transform(getPointAtMatrix(camera));
				face.transform(getProjectionMatrix(camera));

				facesToDraw.push(face);
			}
		}
	}

	facesToDraw = sort(facesToDraw, function(elem1, elem2) {return elem1.getAverageZ() < elem2.getAverageZ();});
	
	for(var i in facesToDraw) {
		var face = facesToDraw[i];

		context.fillStyle = face.getColor(camera);
		context.strokeStyle = 'rgba(30, 30, 30, 1)';
		context.lineWidth = 4;
		context.beginPath();
		context.lineTo((face.vertices[0].x+1)*(canvas.width/2), (face.vertices[0].y+1)*(canvas.height/2));

		for(var j in face.vertices) {
			var nextVertex = face.vertices[(parseInt(j)+1)%face.vertices.length];

			context.lineTo((nextVertex.x+1)*(canvas.width/2), (nextVertex.y+1)*(canvas.height/2));
		}

		context.stroke();
		context.fill();
		context.closePath();
	}
}

setInterval(function() {
	if(!started) {
		started = true;
		setup();
	}

	for(var i in balls) {
		balls[i].velocity.y -= gravity * balls[i].weight;
		balls[i].body.translate(balls[i].velocity);

		var found = false;
		if(balls[i].velocity.y < 0 || balls[i].velocity.z > 0) {
			for(var j in balls[i].body.faces) {
				for(var k in balls[i].body.faces[j].vertices) {
					if(balls[i].velocity.y < 0 && balls[i].body.faces[j].vertices[k].y < -0.2) {
						playAudio(ballAudio);
						balls[i].velocity.y = balls[i].velocity.y * -balls[i].restitution;
						found = true;
					}

					if(balls[i].velocity.z > 0 && balls[i].body.faces[j].vertices[k].z > 1) {
						playAudio(ballAudio);
						balls[i].velocity.z = balls[i].velocity.z * -balls[i].restitution;
						found = true;
					}

					if(found) {
						break;
					}
				}

				if(found) {
					break;
				}
			}
		}

		if(balls[i].velocity.z < 0 && checkCollision(balls[i].body, paddle)) {
			playAudio(paddleAudio);
			balls[i].velocity = {'x': ((mouseX-canv.width/2)/(canv.width/2))*(0.003 + Math.random()*0.002), 'y': ((mouseY-canv.height/2)/(canv.height/2))*0.02 + 0.01, 'z': 0.018};
			if(Math.abs(balls[i].velocity.x) < 0.0005) {
				balls[i].velocity.x += 0.01*Math.random() - 0.005;
			}
		}
	}

	paddleRotationTarget = -((mouseX - canv.width/2)/(canv.width/2))*45;
	paddle.rotate({'x': 0, 'y': 0, 'z': -(paddleRotation-paddleRotationTarget)*paddleRotationSpeed});
	paddleRotation += -(paddleRotation-paddleRotationTarget)*paddleRotationSpeed;

	canv.width = window.innerWidth;
	canv.height = window.innerHeight;

	levelCam['aspectRatio'] = canv.height/canv.width;

	if(contains(inputs, 'w')) {
		levelCam.translate(levelCam.look);
	}
	if(contains(inputs, 's')) {
		levelCam.translate(vectorNegate(levelCam.look));
	}
	if(contains(inputs, 'a')) {
		levelCam.translate(vectorCrossProduct({'x': 0, 'y': 1, 'z': 0}, levelCam.look));
	}
	if(contains(inputs, 'd')) {
		levelCam.translate(vectorCrossProduct({'x': 0, 'y': -1, 'z': 0}, levelCam.look));
	}
	if(contains(inputs, ' ')) {
		levelCam.translate({'x': 0, 'y': 1, 'z': 0});
	}
	if(contains(inputs, 'shift')) {
		levelCam.translate({'x': 0, 'y': -1, 'z': 0});
	}
	if(contains(inputs, 'up')) {
		levelCam.rotate({'x': 1, 'y': 0, 'z': 0});
	}
	if(contains(inputs, 'down')) {
		levelCam.rotate({'x': -1, 'y': 0, 'z': 0});
	}
	if(contains(inputs, 'left')) {
		levelCam.rotate({'x': 0, 'y': 1, 'z': 0});
	}
	if(contains(inputs, 'right')) {
		levelCam.rotate({'x': 0, 'y': -1, 'z': 0});
	}

	var levelView = levels[currLevel].copy();
	render(levelView, canv, levelCam);

}, 1000/gameSpeed);

document.addEventListener('mousemove', function(event) {
	if(paddle) {
		paddle.translate({'x': (mouseX - event.clientX)/(canv.width/1.5), 'y': (mouseY - event.clientY)/(canv.height/0.8), 'z': 0});
	}

	mouseX = event.clientX;
	mouseY = event.clientY;
});

/*document.addEventListener('mousedown', function(event) {
	var ball = new Body([
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(-0.1, -0.1, -0.1),
				new Vertex(-0.1, 0.1, -0.1),
				new Vertex(0.1, 0.1, -0.1),
				new Vertex(0.1, -0.1, -0.1)]),
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(0.1, -0.1, 0.1),
				new Vertex(0.1, 0.1, 0.1),
				new Vertex(-0.1, 0.1, 0.1),
				new Vertex(-0.1, -0.1, 0.1)]),
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(0.1, -0.1, -0.1),
				new Vertex(0.1, 0.1, -0.1),
				new Vertex(0.1, 0.1, 0.1),
				new Vertex(0.1, -0.1, 0.1)]),
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(-0.1, -0.1, 0.1),
				new Vertex(-0.1, 0.1, 0.1),
				new Vertex(-0.1, 0.1, -0.1),
				new Vertex(-0.1, -0.1, -0.1)]),
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(-0.1, -0.1, 0.1),
				new Vertex(-0.1, -0.1, -0.1),
				new Vertex(0.1, -0.1, -0.1),
				new Vertex(0.1, -0.1, 0.1)]),
			new Face({r: 240, g: 240, b: 240, a: 1}, [
				new Vertex(-0.1, 0.1, -0.1),
				new Vertex(-0.1, 0.1, 0.1),
				new Vertex(0.1, 0.1, 0.1),
				new Vertex(0.1, 0.1, -0.1)])]);

		ball.transform([
			[0.2, 0, 0, 0],
			[0, 0.2, 0, 0],
			[0, 0, 0.2, 0],
			[0, 0, 0, 0]]);

		ball.translate({'x': 0, 'y': 0.3, 'z': 0});

		balls.push({'restitution': 0.9, 'weight': 1, 'velocity': {'x': ((Math.random() >= 0.5) ? 0.0015 : -0.0015), 'y': 0, 'z': 0.014}, 'body': ball});
		levels[currLevel].bodies.splice(levels[currLevel].bodies.length-2, 0, ball);
});*/

document.addEventListener('keydown', function(event) {
	var keyPressed = keycode(event.keyCode);
	if(!contains(inputs, keyPressed)) {
		inputs.push(keyPressed);
	}
});

document.addEventListener('keyup', function(event) {
	var keyPressed = keycode(event.keyCode);
	var listIndex = contains(inputs, keyPressed);
	if(listIndex) {
		inputs.splice(listIndex, 1);
	}
});

function keycode(keycode, shift) {
  switch (keycode) {
  	case 16: // Shift
      return 'shift';
    case 32: // Space
      return ' ';
    case 37: // Left
      return 'left';
    case 38: // Up
      return 'up';
    case 39: // Right
      return 'right';
    case 40: // Down
      return 'down';
    case 48:
      return ((shift) ? ')' : '0');
      break;
    case 49:
      return ((shift) ? '!' : '1');
      break;
    case 50:
      return ((shift) ? '@' : '2');
      break;
    case 51:
      return ((shift) ? '#' : '3');
      break;
    case 52:
      return ((shift) ? '$' : '4');
      break;
    case 53:
      return ((shift) ? '%' : '5');
      break;
    case 54:
      return ((shift) ? '^' : '6');
      break;
    case 55:
      return ((shift) ? '&' : '7');
      break;
    case 56:
      return ((shift) ? '*' : '8');
      break;
    case 57:
      return ((shift) ? '(' : '9');
      break;
    case 65: // A
      return ((shift) ? 'A' : 'a');
      break;
    case 66:
      return ((shift) ? 'B' : 'b');
      break;
    case 67:
      return ((shift) ? 'C' : 'c');
      break;
    case 68:
      return ((shift) ? 'D' : 'd');
      break;
    case 69:
      return ((shift) ? 'E' : 'e');
      break;
    case 70:
      return ((shift) ? 'F' : 'f');
      break;
    case 71:
      return ((shift) ? 'G' : 'g');
      break;
    case 72:
      return ((shift) ? 'H' : 'h');
      break;
    case 73:
      return ((shift) ? 'I' : 'i');
      break;
    case 74:
      return ((shift) ? 'J' : 'j');
      break;
    case 75:
      return ((shift) ? 'K' : 'k');
      break;
    case 76:
      return ((shift) ? 'L' : 'l');
      break;
    case 77:
      return ((shift) ? 'M' : 'm');
      break;
    case 78:
      return ((shift) ? 'N' : 'n');
      break;
    case 79:
      return ((shift) ? 'O' : 'o');
      break;
    case 80:
      return ((shift) ? 'P' : 'p');
      break;
    case 81:
      return ((shift) ? 'Q' : 'q');
      break;
    case 82:
      return ((shift) ? 'R' : 'r');
      break;
    case 83:
      return ((shift) ? 'S' : 's');
      break;
    case 84:
      return ((shift) ? 'T' : 't');
      break;
    case 85:
      return ((shift) ? 'U' : 'u');
      break;
    case 86:
      return ((shift) ? 'V' : 'v');
      break;
    case 87:
      return ((shift) ? 'W' : 'w');
      break;
    case 88:
      return ((shift) ? 'X' : 'x');
      break;
    case 89:
      return ((shift) ? 'Y' : 'y');
      break;
    case 90:
      return ((shift) ? 'Z' : 'z');
      break;
    case 186:
      return ((shift) ? ':' : ';');
      break;
    case 187:
      return ((shift) ? '+' : '=');
      break;
    case 188:
      return ((shift) ? '<' : ',');
      break;
    case 189:
      return ((shift) ? '_' : '-');
      break;
    case 190:
      return ((shift) ? '>' : '.');
      break;
    case 191:
      return ((shift) ? '?' : '/');
      break;
    case 192:
      return ((shift) ? '~' : '`');
      break;
    case 219:
      return ((shift) ? '{' : '[');
      break;
    case 220:
      return ((shift) ? '|' : '\\');
      break;
    case 221:
      return ((shift) ? '}' : ']');
      break;
    case 222:
      return ((shift) ? '"' : "'");
      break;
    case 96: // NUMPAD begins here
      return '0';
      break;
    case 97:
      return '1';
      break;
    case 98:
      return '2';
      break;
    case 99:
      return '3';
      break;
    case 100:
      return '4';
      break;
    case 101:
      return '5';
      break;
    case 102:
      return '6';
      break;
    case 103:
      return '7';
      break;
    case 104:
      return '8';
      break;
    case 105:
      return '9';
      break;
    case 106:
      return '*';
      break;
    case 107:
      return '+';
      break;
    case 109:
      return '-';
      break;
    case 110:
      return '.';
      break;
    case 111:
      return '/';
      break;
    default:
      return '';
  }
}