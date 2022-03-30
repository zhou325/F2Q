class Graph{
    constructor(nodes={}, links={}){
        this.nodes = nodes;
        this.links = links;
        console.log("nodes", this.nodes);
        console.log("links", this.links);

        this.current_depth = 0;
        this.current_level = 0;
        this.depth_step = 80;
        this.level_step = 80;
        this.square_width = 50;
        this.circle_r = 25;
        this.margin = 20;
        this.if_add_edge = false;

        this.init_svg();
        this.init_tooltips();
        this.click_selector();
        this.export_graph();
        this.import_graph();
    }

    export_graph(){
        d3.select("#export-graph")
            .on("click", ()=>{
                if(this.is_graph_valid()){
                    // for(let nid in this.nodes){
                    //     let node = this.nodes[nid]
                    //     // this.nodes[nid]['text_content'] = node.text_content;
                    // }
                    let graph = {"nodes":this.nodes, "links":this.links, "level":this.current_level, "depth":this.current_depth, "svg_height":this.svg_height, "previous_ctype":this.previous_ctype};
    
                    let file_id = $("#export-filename").val();
                    if(file_id === ""){
                        file_id = "graph";
                    }
    
                    // to JSON
                    let data = JSON.stringify(graph);
                    let a = document.createElement('a');
                    a.download = file_id + ".json";
                    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
                    a.click();
    
                    // to CSV
                    let csvContent = this.generate_csv_text();
                    let a2 = document.createElement('a');
                    a2.download = file_id + ".csv";
                    a2.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(csvContent);
                    a2.click()
                }
            })
    }

    is_graph_valid(){
        // error checker on exporting the graph
        // 1. only one root is allowed (1 connected component)
        let roots = [];
        let leaves = [];
        for(let nid in this.nodes){
            let node = this.nodes[nid];
            if(node.parents.length === 0){
                roots.push(node);
            }
            if(node.children.length === 0){
                leaves.push(node);
            }
        }
        if(roots.length > 1){
            alert("The tree has more than 1 root! Please make sure there is only 1 starting question.")
            return false;
        } else if(roots.length < 1){ 
            alert("No root is found! Please make sure there is a starting question.")
            return false;
        } else { // roots.length === 1
            let root_type = roots[0].type;
            if(root_type != "q"){ 
                // 2. the root is a question
                alert("The starting node must be a question!")
                return false;
            }
        }
        // 3. no leaf is a question
        for(let i=0; i<leaves.length; i++){
            if(leaves[i].type === "q"){
                alert("The question node cannot be a leaf!");
                return false;
            }
        }
        return true;
    }

    import_graph(){
        let that = this;

        $("#import-graph").click(function(){
            $("#graph-file").click();
        })

        d3.select("#graph-file")
            .on("change", ()=>{
                let files = $('#graph-file')[0].files[0];
                let filename = files.name.split(".");
                let filetype = filename[filename.length-1];
                console.log(filetype)
                let fileReader = new FileReader();
                fileReader.onload = function(fileLoadedEvent) {
                    let textFromFileLoaded = fileLoadedEvent.target.result;
                    if(filetype === "json"){
                        let graph = JSON.parse(textFromFileLoaded);
                        that.recover_graph_from_json(graph);
                    } else if(filetype === "csv"){
                        let graph = that.csv_to_json(textFromFileLoaded);
                        that.recover_graph_from_csv(graph);
                    }                        
                }
                fileReader.readAsText(files, "UTF-8");
            })
    }

    recover_graph_from_json(graph){
        //  can recover the previous layouts
        this.nodes = graph.nodes;
        this.links = graph.links;
        this.current_depth = graph.depth;
        this.current_level = graph.level;
        this.previous_ctype = graph.previous_ctype;

        d3.select("#graph-svg").selectAll("g").remove();
        this.init_svg();
        this.svg_height = graph.svg_height;
        // this.init_tooltips();
        for(let nid in this.nodes){
            this.add_element(this.nodes[nid]);
        }
        for(let eid in this.links){
            this.recover_edge(this.links[eid]);
        }
    }

    recover_graph_from_csv(graph){
        //  cannot recover the previous layouts
        let that = this;

        this.nodes = graph.nodes;
        this.links = graph.links;
        this.current_depth = 0;
        this.current_level = 0;
        this.previous_ctype = "i";

        let roots = [];
        let visited = [];

        for(let nid in this.nodes){
            let node = this.nodes[nid];
            if(node.parents.length === 0){
                roots.push(node);
            }
        }
        for(let i = 0; i<roots.length; i++){
            let root = roots[i];
            dfs(root, 0, i);
        }

        function dfs(root, depth=0, level=0){
            that.current_depth = Math.max(that.current_depth, depth);
            that.current_level = Math.max(that.current_level, level);
            //  compute coords
            root.coords.x = (that.depth_step * depth) % that.svg_width + that.margin;
            root.coords.y = that.level_step * level + that.margin;
            if(root.children.length === 0){
                return
            }
            for(let k = 0; k < root.children.length; k++){
                if(visited.indexOf(root.children[k])===-1){
                    dfs(that.nodes[root.children[k]], depth+1, k);
                    visited.push(root.children[k]);
                }
            }
        }

        d3.select("#graph-svg").selectAll("g").remove();
        this.init_svg();
        // this.init_tooltips();
        for(let nid in this.nodes){
            this.add_element(this.nodes[nid]);
        }
        console.log(this.nodes);
        for(let eid in this.links){
            let sid = eid.split("-")[0];
            let tid = eid.split("-")[1];
            this.links[eid].coord = this.get_edge_coord(this.nodes[sid], this.nodes[tid]);
            this.recover_edge(this.links[eid]);
            
        }
    }

    recover_edge(link){
        let that = this;

        this.edge_group.append("line")
            .classed("graph-edge", true)
            .attr("marker-end", "url(#arrowhead)")
            .attr("x1", link.coord.s.x)
            .attr("y1", link.coord.s.y)
            .attr("x2", link.coord.t.x)
            .attr("y2", link.coord.t.y)
            .attr("id", link.id)
            .on("mouseover", mouseOn)
            .on("mouseout", mouseOff)
            .on("dblclick", dblClick);

        function mouseOn(e){
            if(!that.if_add_edge){
                that.mouse_edge_id = d3.select(this).attr("id");
                d3.select(this).classed("edge-highlighted", true);
            }
        }

        function mouseOff(e){
            d3.select(this).classed("edge-highlighted", false);
        }

        function dblClick(e){
            console.log("click")
            console.log(e)
            d3.select("#edge-input")
                .style("top", e.clientY+"px")
                .style("left", e.clientX+"px")
                .style("opacity", 1)
                .style("z-index", 999);
        }
    }

    generate_csv_text(){
        let row_delimitor = "\r\n";
        let csv_string = "id,type,children,text_content,text_keyword,color";
        csv_string += row_delimitor;
        for(let nid in this.nodes){
            let node = this.nodes[nid];
            let children = "";
            node.children.forEach(c=>{
                children += c+";"
            });
            children = children.slice(0, -1);
            csv_string += node.id + "," + node.type + "," + children + "," + node.text_content + "," + node.text_keyword + "," + node.color + row_delimitor;
        }
        csv_string = csv_string.slice(0, -2);
        return csv_string;
    }

    csv_to_json(csv_string){
        let row_delimitor = "\r\n";
        let df = csv_string.split(row_delimitor);
        let header = df[0].split(",");
        df = df.slice(1);
        let nodes = {};
        let links = {};
        for(let i=0; i<df.length; i++){
            let df_i = df[i].split(",");
            let node_i = {};
            for(let j=0; j<header.length; j++){
                if(header[j] === "children"){
                    let children_i = df_i[j].split(";").filter(d=>d!="");
                    node_i[header[j]] = children_i;
                } else {
                    node_i[header[j]] = df_i[j];
                }
            }
            node_i.parents = [];
            node_i.edges = [];
            node_i.coords = {};
            nodes[node_i.id] = node_i;
        }
        for(let nid in nodes){
            let node = nodes[nid];
            node.children.forEach(c=>{
                let eid = node.id + "-" + c;
                links[eid] = {"id":eid, "source": node.id, "target": c};
                nodes[c].parents.push(nid);
                node.edges.push(eid);
                nodes[c].edges.push(eid);
            })
        }
        return {"nodes": nodes, "links": links};
    }

    init_svg(){
        this.svg_width = parseInt(d3.select("#graph-container").style("width"))-20;
        this.svg_height = 680;
        d3.select("#graph-svg")
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
            
        this.edge_group = d3.select("#graph-svg").append("g")
            .attr("id", "edge-group");
        this.element_group = d3.select("#graph-svg").append("g")
            .attr("id", "element-group");
    }

    init_tooltips() {
        d3.select("#element-input")
            .style("opacity", 0)
            .style("z-index", -1);
        d3.select("#element-display")
            .style("opacity", 0)
            .style("z-index", -1);
        d3.select("#edge-input")
            .style("opacity", 0)
            .style("z-index", -1);
        d3.select("#save-input")
            .on("click", ()=>{
                this.nodes[this.mouse_id].text_content = document.getElementById('input-content').value;
                this.nodes[this.mouse_id].text_keyword = document.getElementById('input-keyword').value;
                d3.select("#element-input")
                    .style("opacity", 0)
                    .style("z-index", -1);
            })
        d3.select("#remove-element")
            .on("click", ()=>{
                this.remove_element();
            })
        d3.select("#remove-edge")
            .on("click", ()=>{
                this.remove_edge();
            })
        d3.select("#cancel-remove-edge")
            .on("click", ()=>{
                d3.select("#edge-input")
                    .style("opacity", 0)
                    .style("z-index", -1);
            })
        
        this.init_color_options();
    }

    init_color_options(){
        let that = this;
        let color_svg_width = 300;
        let color_svg_height = 30;
        let margin = 10;
        let color_svg = d3.select("#input-color").append("svg")
            .attr("width", color_svg_width)
            .attr("height", color_svg_height);
        let colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        this.colors = [];
        for(let i=0; i<10; i++){
            this.colors.push(colorScale(i));
        }
        this.colors[0] = "#9cb6d7";
        this.colors[1] = "#f9c26f";
        let xScale = d3.scaleLinear()
            .domain([0,10])
            .range([margin, color_svg_width-margin]);
        let ng = color_svg.selectAll("circle").data(this.colors);
        ng.exit().remove();
        ng = ng.enter().append("circle").merge(ng)
            .classed("color-node", true)
            .attr("cx", (d,i)=>xScale(i))
            .attr("cy", 10)
            .attr("r", 8)
            .attr("fill", d=>d)
            .attr("stroke", "grey")
            .on("mouseover", mouseOn)
            .on("mouseout", mouseOff)
            .on("click", d => click(d))

        function mouseOn(){
            d3.select(this).classed("highlighted", true);
        }

        function mouseOff(){
            d3.select(this).classed("highlighted", false);
        }

        function click(d){
            d3.select(`#${that.click_id}`).select(".element-shape")
                .attr("fill", d)
            that.nodes[that.click_id].color = d;
        }

        
    }

    remove_element() {
        console.log("remove")
        d3.select(`#${this.mouse_id}`).remove();
        this.nodes[this.mouse_id].edges.forEach(eid=>{
            let sid = eid.split("-")[0];
            let tid = eid.split("-")[1];
            if(this.mouse_id === sid){
                this.nodes[tid].edges.splice(this.nodes[tid].edges.indexOf(eid), 1);
                // delete parents from target
                this.nodes[tid].parents.splice(this.nodes[tid].parents.indexOf(sid), 1);
            } else {
                this.nodes[sid].edges.splice(this.nodes[tid].edges.indexOf(eid), 1);
                // delete children from source
                this.nodes[sid].children.splice(this.nodes[sid].children.indexOf(tid), 1);
            }
            d3.select(`#${eid}`).remove();
            delete this.links[eid];
        });
        delete this.nodes[this.mouse_id];
        
        console.log(this.nodes, this.links)

        d3.select("#element-input")
            .style("opacity", 0)
            .style("z-index", -1);
    }

    remove_edge() {
        d3.select(`#${this.mouse_edge_id}`).remove();
        let sid = this.mouse_edge_id.split("-")[0];
        let tid = this.mouse_edge_id.split("-")[1];

        this.nodes[sid].edges.splice(this.nodes[sid].edges.indexOf(this.mouse_edge_id),1);
        this.nodes[tid].edges.splice(this.nodes[tid].edges.indexOf(this.mouse_edge_id),1);
        this.nodes[sid].children.splice(this.nodes[sid].children.indexOf(this.tid),1)
        this.nodes[tid].parents.splice(this.nodes[tid].parents.indexOf(this.sid),1)
        delete this.links[this.mouse_edge_id];

        d3.select("#edge-input")
            .style("opacity", 0)
            .style("z-index", -1);

        console.log(this.nodes, this.links)
    }

    click_selector(){
        d3.select("#img-q")
            .on("click", ()=>{
                this.init_element("q");
            })
        d3.select("#img-a")
            .on("click", ()=>{
                this.init_element("a");
            })
        d3.select("#img-i")
            .on("click", ()=>{
                this.init_element("i");
            })
        d3.select("#img-arrow")
            .on("click", ()=>{
                this.toggle_add_edge();
                if(this.if_add_edge){
                    this.add_edge();
                } else {
                    this.cancel_add_edge();
                }
            })
    }

    init_element(ctype){
        if(this.previous_ctype){
            if(this.previous_ctype === ctype){
                this.current_level += 1;
            } else {
                this.current_level = 0;
                this.current_depth += 1;
            }
        }
        this.current_id = `${ctype}${this.current_depth}${this.current_level}`;
        let current_element;
        if(!(this.current_id in this.nodes)){
            current_element = {"id":this.current_id, "text_content":"", "text_keyword":"", "children":[], "type":ctype, "parents":[], "edges":[], "coords":{}, "color":""};
            if(ctype === "i"){
                current_element.color = this.colors[1];
            } else{
                current_element.color = this.colors[0];
            }
            this.nodes[this.current_id] = current_element;  
        } else {
            current_element = this.nodes[this.current_id];
        }
                  
        let rx = (this.depth_step * this.current_depth) % this.svg_width + this.margin;
        let ry = this.level_step * this.current_level + this.margin;

        current_element.coords.x = rx;
        current_element.coords.y = ry;

        this.svg_height = Math.max(ry+4*this.circle_r, this.svg_height);

        d3.select("#graph-svg")
            .attr("height", this.svg_height);

        this.previous_ctype = ctype;

        this.add_element(current_element);

    }

    add_element(node){
        console.log(this.nodes)
        let that = this;
        let ctype = node.type;

        let eg = this.element_group.append("g")
            .classed("element-group", true)
            .attr("id", node.id)
            .attr("transform", `translate(${node.coords.x}, ${node.coords.y})`)
            .on("dblclick", dblClick)
            .on("mouseover", mouseOn)
            .on("mouseout", mouseOff)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        if(ctype === "q"){
            this.add_question(eg);
        } else if(ctype === "a"){
            this.add_answer(eg);
        } else if(ctype === "i"){
            this.add_info(eg);
        }

        eg.select(".element-shape")
            .attr("fill", ()=>{
                if(node.color){
                    return node.color;
                } else {
                    return this.colors[0];
                }
            })

        function mouseOn(){
            if(!if_drag){
                if(that.if_add_edge){
                    d3.select(this).select(".element-shape").classed("selectable", true);
                } else{
                    let e = d3.event;
                    d3.select(this).classed("highlighted", true);
                    d3.select("#element-display-content").html(node.text_content);
                    d3.select("#element-display-keyword").html(node.text_keyword);
                    let tooltip_width = parseInt(d3.select("#element-display").style("width"));
                    let tooltip_height = parseInt(d3.select("#element-display").style("height"));

                    d3.select("#element-display")
                        .style("top", `${Math.min(e.clientY+2, that.svg_height-tooltip_height/2)}px`)
                        .style("left", `${Math.min(e.clientX+2, that.svg_width-tooltip_width)}px`)
                        .style("opacity", 1)
                        .style("z-index", 999);
                }
            }
        }

        function mouseOff(){
            d3.select(this).select(".element-shape").classed("selectable", false);
            d3.select(this).classed("highlighted", false);
            d3.select("#element-display")
                .style("opacity", 0)
                .style("z-index", -1);
        }

        let if_drag = false;

        function dragstarted(){
            d3.event.sourceEvent.stopPropagation();

        }

        function dragged(){
            let e = d3.event;
            if(e.type === "drag"){
                if_drag = true;
                let xcoord = e.x;
                let ycoord = e.y;
                d3.select(this)
                    .attr("transform", `translate(${xcoord}, ${ycoord})`);
                let mouse_id = d3.select(this).attr("id");
                // that.nodes[mouse_id].coords.x = xcoord;
                // that.nodes[mouse_id].coords.y = ycoord;
                that.nodes[mouse_id].edges.forEach(eid=>{
                    let sid = eid.split("-")[0];
                    // let tid = eid.split("-")[1];
                    // that.links[eid].coord = that.get_edge_coord(that.nodes[sid], that.nodes[tid]);
                    // d3.select(`#${eid}`)
                    //     .attr("x1", that.links[eid].coord.s.x)
                    //     .attr("y1", that.links[eid].coord.s.y)
                    //     .attr("x2", that.links[eid].coord.t.x)
                    //     .attr("y2", that.links[eid].coord.t.y);
                    if(mouse_id === sid){
                        d3.select(`#${eid}`)
                            .attr("x1", xcoord)
                            .attr("y1", ycoord);
                        } else {
                        d3.select(`#${eid}`)
                            .attr("x2", xcoord)
                            .attr("y2", ycoord);
                        }
                })
            }                    
        }

        function dragended(){
            let e = d3.event;
            let mouse_id = d3.select(this).attr("id");
            // console.log("mouse_id", mouse_id)
            if(if_drag === true && e.type === "end"){
                let xcoord = Math.min(Math.max(0, e.x - that.square_width/2), that.svg_width-that.square_width);
                let ycoord = Math.min(Math.max(0, e.y - that.square_width/2), that.svg_height-that.square_width);
                d3.select(this)
                    .attr("transform", `translate(${xcoord}, ${ycoord})`);
                that.nodes[mouse_id].coords.x = xcoord;
                that.nodes[mouse_id].coords.y = ycoord;
                that.nodes[mouse_id].edges.forEach(eid=>{
                    let sid = eid.split("-")[0];
                    let tid = eid.split("-")[1];
                    that.links[eid].coord = that.get_edge_coord(that.nodes[sid], that.nodes[tid]);
                    d3.select(`#${eid}`)
                        .attr("x1", that.links[eid].coord.s.x)
                        .attr("y1", that.links[eid].coord.s.y)
                        .attr("x2", that.links[eid].coord.t.x)
                        .attr("y2", that.links[eid].coord.t.y);
                            
                })
                if_drag = false;
            }
            that.mouse_id = mouse_id;
        }

        function dblClick(){
            let e = d3.event;
            e.stopPropagation();
            d3.select("#element-input")
                .style("top", e.clientY+"px")
                .style("left", e.clientX+"px")
                .style("opacity", 1)
                .style("z-index", 999);
            document.getElementById('input-content').value = node.text_content;
            document.getElementById('input-keyword').value = node.text_keyword;
            that.click_id = node.id;
        }

    }

    add_question(eg){
        eg.append("rect")
            .attr("width", this.square_width)
            .attr("height", this.square_width)
            .classed("element-shape", true)
            .classed("question-shape", true);
        eg.append("text")
            .classed("element-text", true)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("transform", `translate(${this.square_width/2}, ${this.square_width/2})`)
            .text("Q");
    }

    add_answer(eg){
        eg.append("circle")
            .attr("transform", `translate(${this.circle_r}, ${this.circle_r})`)
            .attr("r", this.circle_r)
            .classed("element-shape", true)
            .classed("answer-shape", true);
        eg.append("text")
            .classed("element-text", true)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("transform", `translate(${this.circle_r}, ${this.circle_r})`)
            .text("A");
    }

    add_info(eg){
        eg.append("rect")
            .attr("transform", `translate(${this.square_width/2}, 0), rotate(45)`)
            .attr("width", this.square_width*Math.sqrt(2)/2)
            .attr("height", this.square_width*Math.sqrt(2)/2)
            .classed("element-shape", true)
            .classed("info-shape", true);
        eg.append("text")
            .classed("element-text", true)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("transform", `translate(${this.square_width/2}, ${this.square_width/2})`)
            .text("i");
    }

    add_edge(){
        let that = this;

        let edge_source;
        let edge_target;

        let line = this.edge_group.append("line")
                .classed("graph-edge", true)
                .classed("current-adding", true)
                .style("opacity", 0);

        d3.selectAll(".element-group")
            .on("click", clickElement);

        function clickElement(){
            d3.event.stopPropagation();
            if(edge_source === undefined){
                let sid = d3.select(this).attr("id");
                // error checker
                if(that.nodes[sid].type === "i"){
                    alert("An information node is always a leaf!");
                } else{
                    edge_source = sid;
                    let xcoord = that.nodes[sid].coords.x + that.square_width/2;
                    let ycoord = that.nodes[sid].coords.y + that.square_width/2;
                    line
                        .attr("x1", xcoord)
                        .attr("y1", ycoord)
                        .attr("x2", xcoord)
                        .attr("y2", ycoord)
                        .style("opacity", 0.8);
                    d3.select("#graph-svg").on("mousemove", mousemove);
                }
            } else if(edge_target === undefined){
                let tid = d3.select(this).attr("id").split("-")[0];
                let is_no_error = true;
                // error checker
                let stype = that.nodes[edge_source].type
                let ttype = that.nodes[tid].type
                if(stype === "q"){
                    if(ttype === "q"){
                        alert("A question cannot be connected to another question!");
                        is_no_error = false;
                    } else if(ttype === "i"){
                        alert("A question cannot be connected to an information node!");
                        is_no_error = false;
                    }
                } else if(stype === "a"){
                    if(ttype === "a"){
                        alert("An answer cannot be connected to another answer!");
                        is_no_error = false;
                    } else if(that.nodes[edge_source].children.length>0 && ttype === "q"){
                        let children_q = that.nodes[edge_source].children.filter(child => child[0] === "q");
                        if(children_q.length > 0){
                            alert("An answer cannot be connected to more than one question!");
                            is_no_error = false;
                        }
                    }
                }
                let eid = edge_source + "-" + tid;
                if(eid in that.links){
                    alert("An edge already exists!");
                    is_no_error = false;
                }
                if(is_no_error){
                    edge_target = tid;
                    let coord_new = that.get_edge_coord(that.nodes[edge_source], that.nodes[edge_target]);
                    line
                        .attr("marker-end", "url(#arrowhead)")
                        .classed("current-adding", false)
                        .attr("x1", coord_new.s.x)
                        .attr("y1", coord_new.s.y)
                        .attr("x2", coord_new.t.x)
                        .attr("y2", coord_new.t.y)
                        .attr("id", eid)
                        .on("mouseover", mouseOn)
                        .on("mouseout", mouseOff)
                        .on("dblclick", dblClick);
                    d3.select("#graph-svg").on("mousemove", null);
                    that.nodes[edge_source].edges.push(eid);
                    that.nodes[edge_target].edges.push(eid);
                    that.links[eid] = {"id":eid, "source": edge_source, "target":edge_target, "coord": coord_new};
                    that.nodes[edge_source].children.push(edge_target);
                    that.nodes[edge_target].parents.push(edge_source);
                } else {
                    edge_source = undefined;
                    that.cancel_add_edge();
                }
                that.toggle_add_edge();
            }

        }

    
        function mousemove() {
            let xcoord = d3.mouse(this)[0];
            let ycoord = d3.mouse(this)[1];
            line.attr("x2", xcoord)
                .attr("y2", ycoord);
        }

        function mouseOn(){
            if(!that.if_add_edge){
                that.mouse_edge_id = d3.select(this).attr("id");
                d3.select(this).classed("edge-highlighted", true);
            }
        }

        function mouseOff(){
            d3.select(this).classed("edge-highlighted", false);
        }

        function dblClick(){
            let e = d3.event;
            console.log("click")
            console.log(e)
            d3.select("#edge-input")
                .style("top", e.clientY+"px")
                .style("left", e.clientX+"px")
                .style("opacity", 1)
                .style("z-index", 999);
        }
    }

    get_edge_coord(s, t){
        let sx = s.coords.x + this.square_width/2;
        let sy = s.coords.y + this.square_width/2;
        let tx = t.coords.x + this.square_width/2;
        let ty = t.coords.y + this.square_width/2;

        let scoord_new = {"x":sx, "y":sy};
        let tcoord_new = {"x":tx, "y":ty};

        let type2eps = {"q": this.square_width/2, "a":this.circle_r, "i":this.square_width/2};

        let s_eps = type2eps[s.type];
        let t_eps = type2eps[t.type]+9;

        let dist = Math.sqrt(Math.pow(sx-tx, 2) + Math.pow(sy-ty, 2));

        if(sx != tx){
            let a = (sy-ty)/(sx-tx);
            let b = sy - a * sx;
            // intersection with source
            if(s.type === "q"){
                if(Math.abs(a) <= 1){
                    scoord_new.x = sx - s_eps * (sx - tx)/Math.abs(sx - tx);
                    if(sy != ty){
                        scoord_new.y = sy - s_eps * Math.abs(a) * (sy - ty)/Math.abs(sy - ty);
                    }
                } else { // a > 0
                    scoord_new.x = sx - s_eps /Math.abs(a)  * (sx - tx)/Math.abs(sx - tx);                        
                    scoord_new.y = sy - s_eps * (sy - ty)/Math.abs(sy - ty);
                } 
            } else if(s.type === "a"){
                scoord_new.x = sx - s_eps * Math.abs(sx-tx)/dist * (sx - tx)/Math.abs(sx - tx);
                if(sy != ty){
                    scoord_new.y = sy - s_eps * Math.abs(sy-ty)/dist * (sy - ty)/Math.abs(sy - ty);
                }
            } else if(s.type === "i"){
                scoord_new.x = sx - 1/(1+Math.abs(a)) * s_eps * (sx - tx)/Math.abs(sx - tx);
                if(sy != ty){
                    scoord_new.y = sy - Math.abs(a)/(1+Math.abs(a)) * s_eps *(sy - ty)/Math.abs(sy - ty);
                }
            }

            if(t.type === "q"){
                if(Math.abs(a) <= 1){
                    tcoord_new.x = tx - t_eps * (tx - sx)/Math.abs(sx - tx);
                    if(sy != ty){
                        tcoord_new.y = ty - t_eps * Math.abs(a) * (ty - sy)/Math.abs(sy - ty);
                    }
                } else{
                    // a > 0
                    tcoord_new.x = tx - t_eps /Math.abs(a)  * (tx - sx)/Math.abs(sx - tx);                        
                    tcoord_new.y = ty - t_eps * (ty - sy)/Math.abs(sy - ty);
                }
            } else if(t.type === "a"){
                tcoord_new.x = tx - t_eps * Math.abs(sx-tx)/dist * (tx - sx)/Math.abs(sx - tx);
                if(sy != ty){
                    tcoord_new.y = ty - t_eps * Math.abs(sy-ty)/dist * (ty - sy)/Math.abs(sy - ty);
                }                    
            } else if(t.type === "i"){
                tcoord_new.x = tx - 1/(1+Math.abs(a)) * t_eps * (tx - sx)/Math.abs(sx - tx);
                if(sy != ty){
                    tcoord_new.y = ty - Math.abs(a)/(1+Math.abs(a)) * t_eps *(ty - sy)/Math.abs(sy - ty);
                }  
            }
        } else { // sx === tx, x=a
            

            if(ty <= sy){
                scoord_new = {"x": sx, "y": sy-s_eps};
                tcoord_new = {"x": tx, "y": ty+t_eps};
            } else {
                scoord_new = {"x": sx, "y": sy+s_eps};
                tcoord_new = {"x": tx, "y": ty-t_eps};
            }
            console.log(scoord_new, tcoord_new)
        }

        return {"s": scoord_new, "t":tcoord_new};
    }

    cancel_add_edge(){
        d3.selectAll("#graph-svg").on("mousemove", null);
        d3.selectAll(".current-adding").remove();
    }

    toggle_add_edge(){
        this.if_add_edge = !this.if_add_edge;
        if(this.if_add_edge){
            d3.select("#img-arrow")
                .style("opacity", 0.3);
        } else {
            d3.select("#img-arrow")
                .style("opacity", 1);
        }
    }
}