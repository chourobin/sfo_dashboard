var updateStats = function(target, data) {
	if (parseInt($(target).text()) != parseInt(data)) {
		$(target).html(data);
		$(target).effect("highlight");
	}
};

var source = new EventSource('/events');
source.onmessage = function(e) {
	// Check origin to prevent hostile sites from injecting data
	var venue = JSON.parse(e.data);

	var hereNow = $(".venue.here_now");
	var usersCount = $(".venue.users_count");
	var rating = $(".venue.rating");
	var likes = $(".venue.likes");
	var tips = $(".venue.tips");

	updateStats(hereNow, venue.hereNow.count);
	updateStats(usersCount, venue.stats.usersCount);
	updateStats(rating, venue.rating.toFixed());
	updateStats(likes, venue.likes.count);
	updateStats(tips, venue.tips.count)
};