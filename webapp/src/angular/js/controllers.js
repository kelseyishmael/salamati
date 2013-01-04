function GitHistoryCtrl($scope, $http){
	
	$scope.url = 'http://192.168.10.126:8182/log?output_format=json&callback=JSON_CALLBACK';
	
	$http.jsonp($scope.url).success(function(data, status){
		console.log(data);
		$scope.history = data.response.commit;
	}).error(function(data, status){
		$scope.error = true;
		
	});
}

GitHistoryCtrl.$inject = ['$scope', '$http'];
