dev:
	docker compose up --build

down:
	docker compose down

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell

seed:
	docker compose exec backend python manage.py seed_demo
