#include "my_application.h"

#include <flutter_linux/flutter_linux.h>
#include <gtk/gtk.h>
#include <sys/stat.h>

#include "flutter/generated_plugin_registrant.h"

struct _MyApplication {
  GtkApplication parent_instance;
  int window_width;
  int window_height;
};

G_DEFINE_TYPE(MyApplication, my_application, GTK_TYPE_APPLICATION)

static void my_application_activate(GApplication* application) {
  MyApplication* self = MY_APPLICATION(application);

  GtkWindow* window = GTK_WINDOW(gtk_application_window_new(GTK_APPLICATION(application)));
  gtk_window_set_title(window, "AniSurge 2");
  gtk_window_set_default_size(window, self->window_width, self->window_height);

  FlView* view = fl_view_new(FL_VIEW_PROP_FLUTTER_ENGINE, nullptr);
  gtk_window_set_child(window, GTK_WIDGET(view));

  fl_register_plugins(FL_PLUGIN_REGISTRY(view));

  gtk_widget_show(GTK_WIDGET(window));
}

static void my_application_startup(GApplication* application) {
  MyApplication* self = MY_APPLICATION(application);
  G_APPLICATION_CLASS(my_application_parent_class)->startup(application);
  self->window_width = 1280;
  self->window_height = 720;
}

static void my_application_class_init(MyApplicationClass* klass) {
  G_APPLICATION_CLASS(klass)->activate = my_application_activate;
  G_APPLICATION_CLASS(klass)->startup = my_application_startup;
}

static void my_application_init(MyApplication* self) {}

MyApplication* my_application_new() {
  return MY_APPLICATION(g_object_new(my_application_get_type(),
                                     "application-id", "com.r3ap3redit.anisurge2",
                                     "flags", G_APPLICATION_FLAGS_NONE,
                                     nullptr));
}
