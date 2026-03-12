(function() {
    var createStyle = function() {
        return ".cocosLoading{position:absolute;margin:-0px -0px;padding:0;top:50%;left:50%}" +
            ".fadeIn{-webkit-animation-name: fadeIn;animation-name: fadeIn;animation-duration: 1s;}" +
            "@keyframes fadeIn {0% {opacity: 0;}100% {opacity: 1;}";
    };
    var createDom = function(id, num) {
        id = id || "cocosLoading";
        num = num || 5;
        var i, item;
        var div = document.createElement("div");
        div.className = "cocosLoading";
        div.id = id;
        //div.style.alignContent = "center";
        //div.style.width = "200px";
        document.body.appendChild(div);

        var height = window.innerHeight;
        if (window.innerWidth < window.innerHeight) {
            div.style.transform = "rotate(90deg)";
            height = window.innerWidth;
        }
        var scale = (window.innerWidth + window.innerHeight) / (480 + 800);
        scale = scale * 0.8;
        // var scale = 1;
        var w = 438 * scale;
        var h = 366 * scale;
        w = 201 * scale;
        h = 256 * scale;

        setTimeout(function() {
            var img = document.createElement("img");
            img.src = "https://myplay.static.g6.zing.vn/talaJS/portalWeb/loading_logo.png";
            // img.src = "loading_logo.png";
            div.appendChild(img);
            img.style.position = "absolute";
            img.style.width = w + "px";
            img.style.height = h + "px";
            img.className = "fadeIn";
            img.style.top = -(h * 0.5) + "px";
            img.style.left = -(w * 0.5) + "px";

            var par = document.createElement("pre");
            par.innerText = "Đang kiểm tra cập nhật"
            par.style.fontFamily = "Arial";
            par.style.fontSize = Math.floor(30 * scale) + "px";
            par.style.color = "#ff8511";
            div.appendChild(par);
            par.style.position = "absolute";
            par.style.top = (height * 0.35) + "px";
            par.style.left = -Math.floor(180 * scale) + "px";
            var count = 0;
            setTimeout(function () {
                if (!isFinishLoad())
                    window.open(window.location.href, "_self", "", true );
            }, 10000);
            par.count = 0;
            setInterval(function(){
                var s = "";
                for (var i = 0; i < par.count; i++) {
                    s = s + ".";
                }
                par.count++;
                if (par.count == 4) {
                    par.count = 0;
                }
                par.innerText = "Đang kiểm tra cập nhật" + s;
            }, 200);
            // }
        }, 0.5);
    };
    (function() {
        var bgColor = document.body.style.background;
        document.body.style.background = "#000";
        var style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = createStyle();
        document.head.appendChild(style);
        createDom();
    })()
})();