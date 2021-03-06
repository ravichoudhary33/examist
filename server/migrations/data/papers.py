import os
import csv
from server import model
from server.migrations.data import db

papers_csv = os.path.join(os.path.dirname(__file__), "../../../data/papers.csv")

# Import the courses
with open(papers_csv, "rb") as data_file:
    rows = csv.reader(data_file)
    papers = []
    skipHeader = False

    for row in rows:
        if not skipHeader:
            skipHeader = True
            continue

        course_code = row[0]

        # Find the course
        course = model.Course.getBy(db.session, code=course_code)

        paper = model.Paper(
            name=row[2],
            period=row[3],
            sitting=int(row[4]),
            year_start=int(row[5]),
            year_stop=int(row[6]),
            link=row[7],
            course=course
        )

        papers.append(paper)

db.session.add_all(papers)
db.session.commit()