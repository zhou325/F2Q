# Decision_Tree_to_Survey

This repository provides the source code for the designer tool that enables users to design a survey via a decision tree, as well as the user interface of the survey.

## Installation 
Download or clone this repository:

```bash
git clone https://github.com/zhou325/Decision_Tree_to_Survey.git
cd Decision_Tree_to_Survey
```

#### To run the user interface:
```bash
cd user-interface
python3 -m http.server 8080
#Hit Ctrl+c to quit
```
You can view the page at http://[::]:8080/ (If possible, please use Chrome).

#### To run the designer tool:
```bash
cd designer-tool
python3 -m http.server 8000
#Hit Ctrl+c to quit
```

You can view the page at http://[::]:8000/  (If possible, please use Chrome).