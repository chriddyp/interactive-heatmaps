(function() {

function update(){
    var graphUrl = $('input').val();
    var urlParts = graphUrl.split('/');
    var plotlyDomain = urlParts[0] + '//' + urlParts[2];

    function init_graph_obj(id, plotlyDomain){
        var obj = {
            graphContentWindow: $('#'+id)[0].contentWindow,
            id: id
        };
        obj['pinger'] = setInterval(function(){
            obj.graphContentWindow.postMessage({task: 'ping'}, plotlyDomain);
        }, 500);
        return obj;
    }

    $('#graph').attr('src', graphUrl);

    window.graphs = {
        'heatmap': init_graph_obj('heatmap', plotlyDomain)
    };

    window.graphs.heatmap['pong'] = function(message){
        console.log('registering pong');
        window.graphs.heatmap.graphContentWindow.postMessage({'task': 'getAttributes'}, plotlyDomain);
        window.graphs.heatmap.graphContentWindow.postMessage({
            'task': 'listen',
            'events': ['click']},
        plotlyDomain);
        window.graphs.heatmap.graphContentWindow.postMessage({
            'task': 'addTraces',
            'traces': [
                {'x': [], 'y': [], 'xaxis': 'x', 'yaxis': 'y2'},
                {'x': [], 'y': [], 'xaxis': 'x2', 'yaxis': 'y'}
            ]
        }, plotlyDomain);
        window.graphs.heatmap.graphContentWindow.postMessage({
            'task': 'relayout',
            'update': {
                'xaxis.domain': [0, 0.75],
                'xaxis2': {
                    'domain': [0.75, 1],
                    'anchor': 'y'
                },
                'yaxis.domain': [0, 0.75],
                'yaxis2': {
                    'domain': [0.75, 1],
                    'anchor': 'x'
                },
                'margin.r': 0,
                'margin.b': 0,
                'paper_bgcolor': '#edf1f8',
                'plot_bgcolor': '#edf1f8',
                'showlegend': false,
                'hidesources': true
            }
        }, plotlyDomain);
    };

    window.graphs.heatmap['click'] = function(message){
        console.log('>> click');

        var xi = message.points[0]['pointNumber'][0];
        var yi = message.points[0]['pointNumber'][1];
        var trace = window.graphs.heatmap.fig['data'][0];
        var z = trace.z;
        var zAlongX = z[xi];
        var zAlongY = [];
        for(var i in z){
            zAlongY.push(z[i][yi]);
        }
        var xs = ('x' in trace ? trace.x : range(zAlongX.length));
        var ys = ('y' in trace ? trace.y : range(zAlongY.length));
        var xp = message.points[0]['x'];
        var yp = message.points[0]['y'];

        window.graphs.heatmap.graphContentWindow.postMessage({
            'task': 'restyle',
            'update': {'x': [xs, zAlongY], 'y': [zAlongX, ys], 'marker.color': '#69738a'},
            'indices': [1,2]
        }, plotlyDomain);

        window.graphs.heatmap.graphContentWindow.postMessage({
            'task': 'relayout',
            'update': {
                'yaxis2.title': 'z (y = '+ yp +')',
                'xaxis2.title': 'z (x = '+ xp +')',
                shapes: [
                    shape('x', xp),
                    shape('y', yp)
                ]
            }
        }, plotlyDomain)
    };

    window.removeEventListener('message', messageListener);
    window.addEventListener('message', messageListener);
}

function shape(axLetter, datum) {
    return {
        type: 'line',
        xref: axLetter==='x' ? 'x' : 'paper',
        x0: axLetter==='x' ? datum : 0.0,
        x1: axLetter==='x' ? datum : 0.78,
        yref: axLetter==='y' ? 'y' : 'paper',
        y0: axLetter==='y' ? datum : 0.04,
        y1: axLetter==='y' ? datum : 0.75,
        line: {
            dash: 'dash',
            width: 4
        },
        opacity: 0.5
    }
}

function range(N){
    var x = [];
    for(var i=0; i<N; i++){
        x.push(i);
    }
    return x;
}

update();
$('#newGraph').click(function(){
    var url = $('input').val();
    $('.input-error').text("");
    if(url.split('/').length-1 !== 4){
        $('.input-error').text("Woops! That URL doesn't look like it's in the right form. Here's an example of a valid URL: https://plot.ly/~cimar/200");
        $('.input-error').show();
        return;
    }
    $('#heatmap').attr('src', url+'.embed');
    $('#heatmap').load(function(){
        update();
    });
});

function messageListener(e) {
    var message = e.data;
    console.log('message: ', message);

    for(graph_id in window.graphs){
        if(window.graphs[graph_id].graphContentWindow === e.source) {
            var graph = window.graphs[graph_id];
            break;
        }
    }

    var pinger = graph.pinger;
    var graphContentWindow = graph.graphContentWindow;
    var id = graph.id;

    if('pong' in message && message.pong) {
        console.log('>> pong');
        clearInterval(pinger);
        if('pong' in graph){
            graph.pong();
        }
    } else if (message.type==='hover' ||
                message.type==='zoom'  ||
                message.type==='click') {
        console.log('>> ', message.type);
        if(message.type !== 'zoom') {
            for(var i in message.points) {
                delete message.points[i].data;
            }
        }

        if(message.type in graph) {
            graph[message.type](message);
        }

    } else if(message.task==='getAttributes'){
        console.log('>> getAttributes');
        graph['fig'] = message.response;
    }
};

})();
