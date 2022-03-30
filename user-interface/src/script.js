var chart_path;
var survey_title;
var introduction;
var instruction;
var data_list;
var data_dict = {};
var answer_record = [];
var current_quesion;

// change filename here
d3.json("../config.json").then(data=>{
    console.log(data)
    chart_path = data.chart_path;
    survey_title = data.survey_title;
    introduction = data.introduction;
    instruction = data.instruction;

    if(!survey_title || survey_title === ""){
        survey_title = "Survey User Interface";
    }
    d3.select("#survey-title")
        .append("h4").html(survey_title);
    
    
    let intro_text = "";
    let instruct_text = "";
    if(introduction && introduction != ""){
        introduction = introduction.split("\n");
        introduction.forEach(t => {
            intro_text += t + "<br>";
        })
            
    } else {
        introduction = undefined;
    }
    if(instruction && instruction != ""){
        instruction = instruction.split("\n");
        instruction.forEach(t => {
            instruct_text += t + "<br>";
        })
    } else {
        instruction = undefined;
    }

    if(introduction){
        let intro_container = d3.select("#container")
            .append("div")
            .attr("id", "intro-page");
        intro_container.append("div")
            .attr("id", "intro-text")
            .classed("info-text", true)
            .html(intro_text);
        $("#intro-page").append('<div class="button-container"><input type="button" class="btn btn-outline-dark" id="intro-page-next" value="Continue"></div>');

        if(instruction){
            let instruct_container = d3.select("#container")
            .append("div")
            .attr("id", "starting-page")
            .style("visibility", "hidden");
            instruct_container.append("div")
                .attr("id", "instruct-text")
                .classed("info-text", true)
                .html(instruct_text);
            $("#starting-page").append('<div class="button-container"><input type="button" class="btn btn-outline-dark" id="start-page-next" value="Continue"></div>');
        }
        
    } else if(instruction){
        let instruct_container = d3.select("#container")
            .append("div")
            .attr("id", "starting-page")
            instruct_container.append("div")
                .attr("id", "instruct-text")
                .classed("info-text", true)
                .html(instruct_text);
            $("#starting-page").append('<div class="button-container"><input type="button" class="btn btn-outline-dark" id="start-page-next" value="Continue"></div>');
    } else {
        d3.select("#survey-container")
            .style("visibility", "visible");
    }

    d3.csv(chart_path).then(data=>{
        console.log(data)
        data_list = data;
    
        data.forEach(d=>{
            d.children = d.children.split(";")
            data_dict[d.id] = d;
        })
        data.forEach(d=>{
            d.children.forEach(c=>{
                if(c!="na" && c!=""){
                    data_dict[c].parents = d.id;
                }
            })
        })
        let root = data_dict[data[0].id];
        draw_question(root);
        d3.select("#previous-question")
            .on("click", ()=>{
                if(current_question){
                    let previous_question_id = data_dict[current_question.parents].parents;
                    let previous_question = data_dict[previous_question_id];
                    answer_record.pop();
                    console.log(previous_question)
                    draw_question(previous_question);
                }
            });
    
        document.getElementById("download-form").onclick = function() {
                // when clicked the button
            let content = "";
            answer_record.forEach(r=>{
                if(r.q!="na"){
                    content += "Q: "+data_dict[r.q]['text_content'];
                    content += "\n";
                }
                content += "A: "+data_dict[r.a]['text_content'];
                content += "\n\n";
            })
                // a [save as] dialog will be shown
            window.open("data:application/txt," + encodeURIComponent(content), "_self");
            }
    
        d3.select("#close-window")
            .on("click", ()=>{
                d3.select("#survey-container").style("visibility", "hidden");
                d3.select("#end-page").style("visibility", "visible");
                d3.selectAll(".btn").style("visibility", "hidden");
            })
    
        d3.select("#panic-button")
            .on("click", ()=>{
                window.location.href = "http://www.google.com";
            })
        
        d3.select("#intro-page-next")
            .on("click", ()=>{
                d3.select("#intro-page").style("visibility", "hidden");
                d3.select("#starting-page").style("visibility", "visible");
            })
        d3.select("#start-page-next")
            .on("click", ()=>{
                d3.select("#starting-page").style("visibility", "hidden");
                d3.select("#survey-container").style("visibility", "visible");
    
            })
    })

})

function draw_question(q){
    current_question = q;
    d3.select("#question").remove();
    // d3.select("#question-container").attr("class", "col-4");
    let container = d3.select("#question-container").append("div")
        .attr("id", "question")
    container.append("div")
        .attr("class", "question-entry")
        .html(q['text_content']);

    // let width = $(d3.select("#question-container").node()).width();
    // let height = "300px";
    // let margin = 50;
    // let svg = d3.select("#question-container").append("svg")
    //     .attr("id", "question-svg")
    //     .attr("width", width)
    //     .attr("height", height);
    // svg.append("text")
    //     .attr("transform", `translate(${margin}, ${margin})`)
    //     .text(q['text_content']);
    draw_answers(data_list.filter(data=>q.children.indexOf(data.id)!=-1));
    d3.select("#download-form").style("visibility", "hidden");
    d3.select("#close-window").style("visibility", "hidden");
    if(q.parents){
        d3.select("#previous-question").style("visibility", "visible");
    } else {
        d3.select("#previous-question").style("visibility", "hidden");
    }

}

function draw_answers(answer_list){
    // console.log(data_list)
    // console.log(answer_list);
    d3.select("#answer").remove();
    let container = d3.select("#answer-container").append("div")
        .attr("id", "answer");
    
    container.selectAll("div").data(answer_list)
        .enter().append("div")
        .attr("class", "answer-entry")
        // .classed("answer-entry")
        .html(d=>d['text_content'])
        .on("mouseover", function(d){
            // d3.select(this).style("background-color", "lightgrey")
            d3.select(this).style("background-color", "lightblue")
        })
        .on("mouseout", function(d){
            d3.select(this).style("background-color", "white")
        })
        .on("click", (d)=>{
            answer_record.push({"q":current_question.id, "a":d.id});
            console.log(d)
            let next_question = data_dict[d.children[0]];
            if(next_question.type === "q"){
                draw_question(next_question);
            } else if(next_question.type === "i"){
                draw_information(next_question);
            }
            
        });
}

function draw_information(info){
    current_question = info
    d3.select("#question").remove();
    d3.select("#answer").remove();
    d3.select("#question-container").attr("class", "col-9");
    let container = d3.select("#question-container").append("div")
        .attr("id", "question")
    container.append("div")
        .attr("class", "question-entry")
        .html(info['text_content']);

    d3.select("#previous-question").style("visibility", "visible");
    d3.select("#download-form").style("visibility", "visible");
    d3.select("#close-window").style("visibility", "visible");
    answer_record.push({"q":"na", "a":info.id});
}

function xmlToJson(xml) {
    // From https://davidwalsh.name/convert-xml-json
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		    obj = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj[attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};


