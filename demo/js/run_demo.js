$(document).ready(function() {
    var isChrome = !!window.chrome && !!window.chrome.webstore;
    var isFirefox = typeof InstallTrigger !== 'undefined';
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    
    if (isChrome || isFirefox || isOpera) {
        JSSDKDemo.init();
        JSSDKDemo.run();
    } else {
        JSSDKDemo.create_alert("incompatible-browser", "It appears that you are using an unsupported browser. Please try this demo on Chrome, Firefox, or Opera.");
    }
});

var JSSDKDemo = (function() {
    var detector = null;
    var capture_frames = false;
    var ready_to_accept_input = true;
    var finished_watching = false;
    var processed_frames = [ [], [], [], [], [] ];
    var frames_since_last_face = 0;
    var face_visible = true;

    var plot_window_ms = 20000;
    var video_cutoff_sec = 0;
    var playing = false;
    
    var time_left_sec = 0;

    var emotions = ["joy", "anger", "disgust", "contempt", "surprise"];
    var colors = ["#FFFFFF", "orangered", "deeppink", "yellow", "green"];
    var selected_emotion = "all";
    var svg_width = 720;
    var x_scale = d3.scale.linear().domain([0, 0]).range([0, svg_width]);
    var y_scale = d3.scale.linear().domain([100, 0]).range([2, 248]);
    var t = null;
    var cursor_interval = null;
    var uuid = null;
    
    var API_KEY = "AIzaSyCdQbLORhF7PGVJ7DG1tkoVJGgDYwA_o0M";

    var run = function() {
        var facevideo_node = document.getElementById("facevideo-node");
        detector = new affdex.CameraDetector(facevideo_node);
        detector.detectAllEmotions();
        
        detector.addEventListener("onWebcamConnectSuccess", function() {
            show_message("msg-starting-webcam");
        });
        
        detector.addEventListener("onWebcamConnectFailure", function() {
            show_message("msg-webcam-failure");
        });
        
        if (detector && !detector.isRunning) {
            detector.start();
        }

        uuid = guid();
        console.log("UUID: " + uuid);

        begin_capture();
        capture_frames = true;
        
        // get the video element inside the div with id "facevideo-node"
        var face_video = $("#facevideo-node video")[0];
        face_video.addEventListener("playing", function() {
            show_message("msg-detector-status");
        });
        
        detector.addEventListener("onInitializeSuccess", function() {
            show_message("msg-initialized");
        });
        
        detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
            // get the time as close to the actual time of the frame as possible
            $(".demo-message").hide();
            //  account for time spent buffering
            var fake_timestamp = get_current_time_adjusted();

            if (capture_frames) {
                if (frames_since_last_face > 100 && face_visible) {
                    face_visible = false;
                    create_alert("no-face", "No face was detected. Please re-position your face and/or webcam.");
                }
                
                if (faces.length > 0) {
                    if (!face_visible) {
                        face_visible = true;
                        fade_and_remove("#no-face");
                        $("#lightbox").fadeOut(1000);
                    }
                    frames_since_last_face = 0;
                    emotions.forEach(function(val, idx) {
                        processed_frames[idx].push([fake_timestamp, faces[0].emotions[val]]);
                    });
                } else {
                    frames_since_last_face++;
                    emotions.forEach(function(val, idx) {
                        processed_frames[idx].push([fake_timestamp, 0]);
                    });
                }
                
                update_plot();
            }
        });
    };
        
    var begin_capture = function() {
        // take care of gap at beginning
        current_time = Date.now();
        x_scale = d3.scale.linear().domain([current_time - plot_window_ms,  current_time]).range([0, svg_width]);
        emotions.forEach( function(val, idx) {
            processed_frames[idx].push([current_time, 0]);
        });
        
        capture_frames = true;
        
        $("#video-container").show();
        init_plot();
    };
    
    var stop_capture = function() {
        capture_frames = false;
        detector.stop();
        $(".alert").hide();
        
        // focus on message
        $("#lightbox").fadeIn(750, function() {
            
            // make emotion buttons and player clickable
            //$("#ul-wrapper").css("pointer-events", "");
            $("#player").css("pointer-events", "");
            
            $("#play-again").fadeIn(500, function() {
                $("#lightbox").one("click", transition_to_playback);
            });
        });
    };
    
    
    var path = d3.svg.line().x(function(d, i) {
        return x_scale(d[0])
    }).y(function(d, i) {
        return y_scale(d[1])
    }).interpolate("basis");
    
    var init_plot = function() {
        var curve = d3.select("#svg-curve");

        var initial_data = [
            [ [0, 0] ], // joy
            [ [0, 0] ], // anger
            [ [0, 0] ], // disgust
            [ [0, 0] ], // contempt
            [ [0, 0] ]  // surprise
        ];

        curve.selectAll("path.curve").data(initial_data)
        .enter().append("svg:path")
        .attr("class", "curve")
        .attr("id", function(d, i){return emotions[i]})
        .attr("d", path).attr("stroke", function(d, i) { return colors[i] } )
        .attr("fill", "transparent")
        .attr("stroke-width","2px")
        .attr("stroke-opacity", "1");
    };

    var update_plot = function(message) {
        current_time = Date.now();
        x_scale = d3.scale.linear().domain([current_time - plot_window_ms,  current_time]).range([0, svg_width]);
        var curve = d3.select("#svg-curve");
        curve.selectAll("path.curve").data(processed_frames)
            .attr("d", path);
    };

    
    var text_time = function(time_sec) {
        return Math.floor(time_sec / 60) + ":" + ((time_sec % 60 < 10) ? ("0" + time_sec % 60) : time_sec % 60);
    };

    var guid = function() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }
    
    var no_internet = function() {
        $(".alert").hide();
        create_alert("terminated", "It appears that you aren't connected to the Internet anymore. Please refresh the page and try again.");
    };
    
    var http_get_async = function(url, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                callback(xmlHttp.responseText);
            }
        };
        xmlHttp.open("GET", url, true);
        xmlHttp.send(null);
    };
    
    var get_current_time_adjusted = function() {
        return Date.now()
    };
    
    var create_alert = function(id, text) {
        $("#lightbox").fadeIn(500);
        $("<div></div>", {
            id: id,
            class: "alert alert-danger",
            display: "none",
            text: text,
        }).appendTo("#lightbox");
        $("#" + id).css({"text-align": "center", "z-index": 2});
        $("#" + id).fadeIn(1000);
    };
    
    var show_message = function(id) {
        $(".demo-message").hide();
        $(document.getElementById(id)).fadeIn("fast");
    };
    
    var fade_and_remove = function(id) {
        $(id).fadeOut(500, function() {
            this.remove();
        });
    };
    
    
    
    return {
        init: function() {
            // "show all" button
            $("#all").css("border", "3px solid #ffcc66");
            
            $("#all").click(function() {
                // set border
                if (selected_emotion !== "all") {
                    $("#" + selected_emotion).css("border", "");
                    $(this).css("border", "3px solid #ffcc66");
                }
                selected_emotion = "all";
                
                var curve = d3.select("#svg-curve");
                curve.selectAll("path.curve")
                    .transition()
                    .duration(400)
                    .attr("stroke-opacity", 1.0);
            });
        },

        run: run,

        responses: function(clicked_id) {
            // set border
            if (selected_emotion !== clicked_id) {
                $("#" + selected_emotion).css("border", "");
                $("#" + clicked_id).css("border", "3px solid #ffcc66");
            }
            selected_emotion = clicked_id;
            
            var curve = d3.select("#svg-curve");
            curve.selectAll("path.curve")
                .transition()
                .duration(400)
                .attr("stroke-opacity", function(d,i) {
                    if (this.id === clicked_id) {
                        return 1.0;
                    } else {
                        return 0.2;
                    }
                });
        },
        
        create_alert: create_alert
    };
})();
