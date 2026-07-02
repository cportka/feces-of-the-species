angular.module('feces-of-the-species', ['ngRoute', 'ngAnimate'])
    .config(breakroomRouter);

function breakroomRouter($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'partials/home.html'
        })
        .when('/question1', {
            templateUrl: 'partials/question1.html'
        })
        .when('/question2', {
            templateUrl: 'partials/question2.html'
        })
        .when('/question3', {
            templateUrl: 'partials/question3.html'
        })
        .when('/question4', {
            templateUrl: 'partials/question4.html'
        })
        .when('/question5', {
            templateUrl: 'partials/question5.html'
        })
        .when('/results', {
            templateUrl: 'partials/results.html'
        })
}

function navController($scope, $location) {
    $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };
}

var answer1 = "";
var answer2 = "";
var answer3 = "";
var answer4 = "";
var answer5 = "";

function answer1Input() {
    answer1 = $("#question1").val();
}

function answer2Input() {
    answer2 = $("#question2").val();
}

function answer3Input() {
    answer3 = $("#question3").val();
}

function answer4Input() {
    answer4 = $("#question4").val();
}

function answer5Input() {
    answer5 = $("#question5").val();
}