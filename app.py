from flask import Flask, render_template, request, jsonify
import mysql.connector

app = Flask(__name__)

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="hostel_db"
)

cursor = db.cursor(dictionary=True)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/students")
def get_students():

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM students")
        students = cursor.fetchall()

        cursor.close()
        db.close()

        return jsonify(students)

    except Exception as e:
        print("ERROR IN /students:", e)
        return jsonify({"error": str(e)})

@app.route("/rooms")
def get_rooms():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM rooms")
    rooms = cursor.fetchall()

    return jsonify(rooms)


@app.route("/vacant_rooms")
def get_vacant_rooms():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT number FROM rooms WHERE status='vacant'")
    rooms = cursor.fetchall()

    return jsonify(rooms)


@app.route("/add_student", methods=["POST"])
def add_student():
    try:
        data = request.get_json()
        print("DATA:", data)   # debug

        db = get_db()
        cursor = db.cursor()

        sql = """
        INSERT INTO students (name, room, course, phone, status)
        VALUES (%s,%s,%s,%s,%s)
        """

        cursor.execute(sql, (
            data["name"],
            data["room"],
            data["course"],
            data["phone"],
            "active"
        ))

        # update room
        cursor.execute(
            "UPDATE rooms SET status='occupied' WHERE number=%s",
            (data["room"],)
        )

        db.commit()

        cursor.close()
        db.close()

        return jsonify({"message": "Student added"})

    except Exception as e:
        print("ERROR IN ADD STUDENT:", e)
        return jsonify({"error": str(e)})

@app.route("/delete_student/<int:id>", methods=["DELETE"])
def delete_student(id):

    # get room number first
    cursor.execute("SELECT room FROM students WHERE id=%s", (id,))
    student = cursor.fetchone()

    if student:
        room = student["room"]

        # delete student
        cursor.execute("DELETE FROM students WHERE id=%s", (id,))

        # make room vacant again
        cursor.execute(
            "UPDATE rooms SET status='vacant' WHERE number=%s",
            (room,)
        )

        db.commit()

    return jsonify({"message":"Student deleted"})


@app.route("/stats")
def get_stats():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_rooms FROM rooms")
    total_rooms = cursor.fetchone()["total_rooms"]

    cursor.execute("SELECT COUNT(*) AS students FROM students")
    students = cursor.fetchone()["students"]

    return jsonify({
        "total_rooms":total_rooms,
        "students":students
    })

@app.route("/block_occupancy")
def block_occupancy():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        RIGHT(number,1) AS block,
        COUNT(*) AS total,
        SUM(status='occupied') AS occupied
        FROM rooms
        GROUP BY block
    """)

    blocks = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(blocks)

@app.route("/room_summary")
def room_summary():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT type,
        COUNT(*) AS total,
        SUM(status='occupied') AS occupied,
        SUM(status='vacant') AS vacant
        FROM rooms
        GROUP BY type
    """)

    data = cursor.fetchall()

    return jsonify(data)

@app.route("/add_payment", methods=["POST"])
def add_payment():

    data = request.get_json()

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor()

    sql = """
    INSERT INTO payments (student, amount, payment_date, status)
    VALUES (%s,%s,CURDATE(),%s)
    """

    cursor.execute(sql,(
        data["student"],
        data["amount"],
        data["status"]
    ))

    db.commit()

    return jsonify({"message":"payment recorded"})

@app.route("/recent_payments")
def recent_payments():

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
    SELECT student, amount, payment_date, status
    FROM payments
    ORDER BY id DESC
    LIMIT 5
""")

    payments = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(payments)

@app.route("/fee_stats")
def fee_stats():

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="hostel_db"
    )

    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT
        SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS collected,
        SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS pending,
        SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END) AS overdue
        FROM payments
    """)

    result = cursor.fetchone()

    cursor.close()
    db.close()

    return jsonify({
        "collected": result["collected"] or 0,
        "pending": result["pending"] or 0,
        "overdue": result["overdue"] or 0
    })

@app.route("/add_complaint", methods=["POST"])
def add_complaint():

    data = request.get_json()

    db = get_db()
    cursor = db.cursor()

    sql = """
    INSERT INTO complaints
    (title, room, description, priority, student, status)
    VALUES (%s,%s,%s,%s,%s,%s)
    """

    values = (
        data["title"],
        data["room"],
        data["description"],
        data["priority"],
        data["student"],
        "open"
    )

    cursor.execute(sql, values)
    db.commit()

    cursor.close()
    db.close()

    return jsonify({"message": "Complaint added"})

if __name__ == "__main__":
    app.run(debug=True)