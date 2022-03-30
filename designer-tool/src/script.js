init();

function init(){
    add_selector();
    let graph = new Graph();

}

function add_selector(){
    let imgs = [{'id':'img-q', 'url':"../public/assets/q.png"}, {'id':'img-a', 'url':"../public/assets/a.png"}, {'id':'img-i', 'url':"../public/assets/i.png"}, {'id':'img-arrow', 'url':"../public/assets/arrow.png"}];
    let imgs_container = d3.select("#selector-container").append("div")
        .classed("img-container", true);
    let ig = imgs_container.selectAll("img").data(imgs);
    ig.exit().remove();
    ig = ig.enter().append("img").merge(ig)
        .attr("src", d=>d.url)
        .attr("id", d => d.id)
        .on("mouseover", mouseOn)
        .on("mouseout", mouseOff)
    
    function mouseOn(){
        d3.select(this).classed("highlighted", true);
    }

    function mouseOff(){
        d3.select(this).classed("highlighted", false);
    }
}

